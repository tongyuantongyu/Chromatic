//
// Created by TYTY on 2020-08-11 011.
//

#include "cimg.h"

#ifdef WIN32
#include "header/avif.h"
#else
#include <avif/avif.h>
#endif

// Estimated by human eye.

i32 AVIFQualityTransform(u8 quality) {
  if (quality > 100) {
    return 6;
  } else if (quality > 90) {
    return -2.2 * quality + 226;
  } else if (quality > 80) {
    return -0.8 * quality + 100;
  } else if (quality > 20) {
    return -0.2 * quality + 52;
  } else if (quality > 10) {
    return -0.4 * quality + 56;
  } else {
    return -0.8 * quality + 60;
  }
}

bool IsAVIF(const u8 *data, size_t size, u32* width, u32* height) {
  avifDecoder *decoder = avifDecoderCreate();
  bool readResult = false;

  if (avifDecoderSetIOMemory(decoder, data, size) != AVIF_RESULT_OK) {
    goto cleanup;
  }

  if (avifDecoderParse(decoder) != AVIF_RESULT_OK) {
    goto cleanup;
  }

  *width = decoder->image->width;
  *height = decoder->image->height;
  readResult = true;

  cleanup:
  avifDecoderDestroy(decoder);

  return readResult;
}

bool DecAVIF(const u8 *data, size_t size, Frame *img) {
  if (data == NULL || img == NULL || size < 16) {
    return false;
  }

  bool readResult = false;

  avifImage* image = avifImageCreateEmpty();
  avifDecoder* decoder = avifDecoderCreate();
  avifResult result;
  if (avifDecoderSetIOMemory(decoder, data, size) != AVIF_RESULT_OK) {
    goto cleanup;
  }

  result = avifDecoderRead(decoder, image);

  if (result != AVIF_RESULT_OK) {
    goto cleanup;
  }

  if (image->width > GetMaxSize() || image->height > GetMaxSize()) {
    goto cleanup;
  }

  avifRGBImage rgb;
  avifRGBImageSetDefaults(&rgb, image);
  rgb.chromaUpsampling = AVIF_CHROMA_UPSAMPLING_BILINEAR;

  if (!image->alphaPlane) {
    rgb.format = AVIF_RGB_FORMAT_RGB;
    img->format = FORMAT_RGB;
  } else {
    img->format = FORMAT_RGBA;
  }

  rgb.depth = 8;

  img->width = rgb.width;
  img->height = rgb.height;
  img->depth = rgb.depth;

  // currently no way to do estimate. provide a conservative value
  img->quality = 95;

  AllocateFrame(img);

  rgb.pixels = img->pixel;
  rgb.rowBytes = img->stride;

  result = avifImageYUVToRGB(image, &rgb);

  if (result == AVIF_RESULT_OK) {
    readResult = true;
  }

  cleanup:
  avifImageDestroy(image);
  avifDecoderDestroy(decoder);

  if (!readResult) {
    ReleaseFrame(img);
  }

  return readResult;
}

bool EncAVIF(u8** data, size_t* size, Frame *img) {
  if (img == NULL || img->format == FORMAT_UNDEFINED || img->pixel == NULL) {
    return false;
  }

  bool encodeResult = false;

  // drawings usually have sharp border so we use yuv444 to prevent color bleeding
  avifPixelFormat format = AVIF_PIXEL_FORMAT_YUV444;

  // Keep 10bit at max, until HDR content is widely supported
  // and `correctly` handled.
  // Currently browsers' HDR handling lack consideration.
  // Chrome simply overexpose high brightness area,
  // Firefox assume everything non-HDR.
  // So, No HDR content currently.

  // Currently we are forced to use limited range
  // because Firefox assume everything in limited range.
  // However we are also forced to use 8bit
  // because 10bit decoding is incredibly slow

  // Now we can only use the most simple limited range 8 bit content.
  // Sorry for possible color banding :(
//  u32 depth = img->depth > 8 ? 10 : 8;
  u32 depth = 8;

  avifImage* image = avifImageCreate(img->width, img->height, depth, format);

  // firefox can't handle full ranged image (or, any content. An old bug.) correctly.
  image->yuvRange = AVIF_RANGE_LIMITED;

  //defaults
  image->colorPrimaries = AVIF_COLOR_PRIMARIES_BT709;
  image->transferCharacteristics = AVIF_TRANSFER_CHARACTERISTICS_SRGB;
  image->matrixCoefficients = AVIF_MATRIX_COEFFICIENTS_BT709;

  avifRGBImage rgb;
  avifRGBImageSetDefaults(&rgb, image);
  rgb.depth = img->depth;

  avifEncoder* encoder = avifEncoderCreate();
  avifRWData output = AVIF_DATA_EMPTY;

  switch (img->format) {
    case FORMAT_RGB:
      rgb.format = AVIF_RGB_FORMAT_RGB;
      break;
    case FORMAT_BGR:
      rgb.format = AVIF_RGB_FORMAT_BGR;
      break;
    case FORMAT_RGBA:
      rgb.format = AVIF_RGB_FORMAT_RGBA;
      break;
    case FORMAT_BGRA:
      rgb.format = AVIF_RGB_FORMAT_BGRA;
      break;
    case FORMAT_ARGB:
      rgb.format = AVIF_RGB_FORMAT_ARGB;
      break;
    case FORMAT_ABGR:
      rgb.format = AVIF_RGB_FORMAT_ABGR;
      break;
    default:
      goto cleanup;
  }

  rgb.pixels = img->pixel;
  rgb.rowBytes = img->stride;

  avifImageRGBToYUV(image, &rgb);

  encoder->codecChoice = AVIF_CODEC_CHOICE_AOM;

  // however due to huge memory usage of aom, we can't perform multiple encode
  // simultaneously. We let one task take all CPU.
  encoder->maxThreads = GetMaxThread();

  i32 quality = AVIFQualityTransform(Quality(img->width, img->height, img->quality));

  encoder->minQuantizer = quality;
  encoder->maxQuantizer = (quality + 8) > 64 ? 64 : (quality + 8);

  // use highest quality for alpha, to reduce quality loss
  encoder->minQuantizerAlpha = 0;
  encoder->maxQuantizerAlpha = 0;

  // relatively good choice between speed and size
  encoder->speed = 3;

  // add some really fine noise to control banding
  avifEncoderSetCodecSpecificOption(encoder, "film-grain-table", "dither.tbl");

  if (avifEncoderWrite(encoder, image, &output) == AVIF_RESULT_OK) {
    *data = output.data;
    *size = output.size;
    encodeResult = true;
  }

  cleanup:
  avifImageDestroy(image);
  avifEncoderDestroy(encoder);
  if (!encodeResult && output.data) {
    avifRWDataFree(&output);
  }

  return encodeResult;
}
