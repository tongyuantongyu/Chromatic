//
// Created by TYTY on 2020-08-07 007.
//

#include <memory.h>
#include "cimg.h"

#ifdef WIN32
#include "header/png/png.h"
#else
#include <png.h>
#endif


typedef struct {
  const uint8_t* data;
  size_t data_size;
  png_size_t offset;
} PNGReadContext;

static void ReadFunc(png_structp png_ptr, png_bytep data, png_size_t length) {
  PNGReadContext* const ctx = (PNGReadContext*)png_get_io_ptr(png_ptr);
  if (ctx->data_size - ctx->offset < length) {
    png_error(png_ptr, "ReadFunc: invalid read length (overflow)!");
  }
  memcpy(data, ctx->data + ctx->offset, length);
  ctx->offset += length;
}

bool IsPNG(const u8 *data, size_t size, u32* width, u32* height) {
  if (png_sig_cmp(data, 0, size < 8 ? size : 8)) {
    return false;
  }

  bool readResult = false;
  volatile png_structp png = NULL;
  volatile png_infop info = NULL;
  PNGReadContext context = { data, size, 0 };

  png = png_create_read_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
  if (!png) {
    goto cleanup;
  }

  if (setjmp(png_jmpbuf(png))) {
    goto cleanup;
  }

  info = png_create_info_struct(png);
  if (info == NULL) goto cleanup;

  png_set_read_fn(png, &context, ReadFunc);
  png_read_info(png, info);
  if (!png_get_IHDR(png, info,
                    width, height,
                    NULL, NULL, NULL,NULL, NULL)) goto cleanup;

  readResult = true;

  cleanup:
  if (png) {
    png_destroy_read_struct((png_structpp)&png, (png_infopp)&info, NULL);
  }

  return readResult;
}

bool DecPNG(const u8* data, size_t size, Frame* img) {
  if (data == NULL || img == NULL || size < 8) {
    return false;
  }

  volatile bool readResult = false;
  volatile png_structp png = NULL;
  volatile png_infop info = NULL;
  volatile png_infop end_info = NULL;
  PNGReadContext context = { data, size, 0 };
  i32 color_type, bit_depth, interlaced;
  i32 has_alpha;
  i32 num_passes;
  u32 width, height, y;

  if (png_sig_cmp(data, 0, 8)) {
    goto cleanup;
  }

  png = png_create_read_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
  if (!png) {
    goto cleanup;
  }

  if (setjmp(png_jmpbuf(png))) {
    goto cleanup;
  }

  info = png_create_info_struct(png);
  if (info == NULL) goto cleanup;
  end_info = png_create_info_struct(png);
  if (end_info == NULL) goto cleanup;

  png_set_read_fn(png, &context, ReadFunc);
  png_read_info(png, info);
  if (!png_get_IHDR(png, info,
                    &width, &height, &bit_depth, &color_type, &interlaced,
                    NULL, NULL)) goto cleanup;

  if (width > GetMaxSize() || height > GetMaxSize()) {
    goto cleanup;
  }

  img->width = width;
  img->height = height;
  img->depth = bit_depth;
  img->quality = 100;

  if (bit_depth == 16) {
    png_set_swap(png);
  }

  png_set_packing(png);
  if (color_type == PNG_COLOR_TYPE_PALETTE) {
    png_set_palette_to_rgb(png);
  }
  if (color_type == PNG_COLOR_TYPE_GRAY ||
      color_type == PNG_COLOR_TYPE_GRAY_ALPHA) {
    if (bit_depth < 8) {
      png_set_expand_gray_1_2_4_to_8(png);
    }
    png_set_gray_to_rgb(png);
  }
  if (png_get_valid(png, info, PNG_INFO_tRNS)) {
    png_set_tRNS_to_alpha(png);
    has_alpha = 1;
  } else {
    has_alpha = !!(color_type & PNG_COLOR_MASK_ALPHA);
  }

  img->format = has_alpha ? FORMAT_RGBA : FORMAT_RGB;
  AllocateFrame(img);

  // Apply gamma correction if needed.
  {
    double image_gamma = 1 / 2.2, screen_gamma = 2.2;
    int srgb_intent;
    if (png_get_sRGB(png, info, &srgb_intent) ||
        png_get_gAMA(png, info, &image_gamma)) {
      png_set_gamma(png, screen_gamma, image_gamma);
    }
  }

  num_passes = png_set_interlace_handling(png);
  png_read_update_info(png, info);


  for (u32 p = 0; p < num_passes; ++p) {
    png_bytep row = img->pixel;
    for (y = 0; y < height; ++y) {
      png_read_rows(png, &row, NULL, 1);
      row += img->stride;
    }
  }

  readResult = true;

  cleanup:
  if (png) {
    png_destroy_read_struct((png_structpp)&png, (png_infopp)&info, (png_infopp)&end_info);
  }

  if (!readResult) {
    ReleaseFrame(img);
  }

  return readResult;
}
