//
// Created by TYTY on 2020-08-08 008.
//

#include "cimg.h"

#ifdef WIN32
#include "header/webp/encode.h"
#include "header/webp/decode.h"
#include "header/webp/mux.h"
#include "header/webp/demux.h"
#else
#include <webp/encode.h>
#include <webp/decode.h>
#include <webp/mux.h>
#include <webp/demux.h>
#endif

bool IsWEBP(const u8 *data, size_t size, u32* width, u32* height) {
  // how can an image dimension overflow i32
  #pragma GCC diagnostic ignored "-Wpointer-sign"
  return WebPGetInfo(data, size, width, height);
}

bool DecWEBP(const u8 *data, size_t size, Frame *img) {
  if (data == NULL || img == NULL || size < 16) {
    return false;
  }

  bool readResult = false;
  VP8StatusCode status;
  WebPDecoderConfig config;
  WebPDecBuffer* const output_buffer = &config.output;
  WebPBitstreamFeatures* const bitstream = &config.input;

  if (!WebPInitDecoderConfig(&config)) {
    goto cleanup;
  }

  status = WebPGetFeatures(data, size, bitstream);
  if (status != VP8_STATUS_OK) {
    goto cleanup;
  }

  img->width = bitstream->width;
  img->height = bitstream->height;
  img->depth = 8;
  img->format = bitstream->has_alpha ? FORMAT_RGBA : FORMAT_RGB;

  if (img->width > GetMaxSize() || img->height > GetMaxSize()) {
    goto cleanup;
  }

  WebPData d = {data, size};
  WebPDemuxer* demux = WebPDemux(&d);
  WebPIterator iter;
  WebPDemuxGetFrame(demux, 1, &iter);

  if (bitstream->format != 1) {
    img->quality = 100;
  } else {
    img->quality = QualityWEBP(iter.fragment.bytes, iter.fragment.size);
  }

  AllocateFrame(img);

  output_buffer->colorspace = bitstream->has_alpha ? MODE_RGBA : MODE_RGB;
  output_buffer->width = img->width;
  output_buffer->height = img->height;
  output_buffer->u.RGBA.rgba = img->pixel;
  output_buffer->u.RGBA.stride = img->stride;
  output_buffer->u.RGBA.size = img->stride * img->height;

  output_buffer->is_external_memory = 1;
  status = WebPDecode(iter.fragment.bytes, iter.fragment.size, &config);

  readResult = (status == VP8_STATUS_OK);

  cleanup:
  if (!readResult) {
    ReleaseFrame(img);
  }

  return readResult;
}

bool EncWEBP(u8** data, size_t* size, Frame *img) {
  if (img == NULL || img->format == FORMAT_UNDEFINED || img->pixel == NULL) {
    return false;
  }

  WebPMemoryWriter memory_writer;
  WebPConfig config;
  WebPPicture picture;

  bool readResult = false;

  WebPMemoryWriterInit(&memory_writer);

  if (!WebPPictureInit(&picture) ||
      !WebPConfigInit(&config)) {
    goto cleanup;
  }

  // lossy compress
  config.lossless = 0;

  // conditional decide quality
  config.quality = Quality(img->width, img->height, img->quality);

  // mainly for drawing.
  config.sns_strength = 25;

  // slower for better quality
  config.method = 6;

  // allow auto filter adjust
  config.autofilter = 1;

  // allow multi thread encode
  config.thread_level = 1;

  // enhance image quality
  config.use_sharp_yuv = 1;


  picture.width = img->width;
  picture.height = img->height;

  Frame* src = img;

  if (src->depth == 16) {
    Frame* tmp = (Frame *)malloc(sizeof(Frame));
    tmp->width = src->width;
    tmp->height = src->height;
    tmp->format = src->format;
    tmp->depth = 8;
    tmp->pixel = NULL;
    tmp->stride = 0;

    AllocateFrame(tmp);

    CloneFrame(src, tmp, 0, 0, src->width, src->height);
    src = tmp;
  }

  switch (img->format) {
    case FORMAT_RGB:
      WebPPictureImportRGB(&picture, src->pixel, src->stride);
      break;
    case FORMAT_BGR:
      WebPPictureImportBGR(&picture, src->pixel, src->stride);
      break;
    case FORMAT_RGBA:
      WebPPictureImportRGBA(&picture, src->pixel, src->stride);
      break;
    case FORMAT_BGRA:
      WebPPictureImportBGRA(&picture, src->pixel, src->stride);
      break;
    default:
      // not implemented
      goto cleanup;
  }

  picture.writer = WebPMemoryWrite;
  picture.custom_ptr = (void*)&memory_writer;

  readResult = WebPEncode(&config, &picture) != 0;

  WebPPictureFree(&picture);

  // data shall be freed by caller
  *data = memory_writer.mem;
  *size = memory_writer.size;

  cleanup:
  if (src != img) {
    ReleaseFrame(src);
    free(src);
  }

  return readResult;
}

