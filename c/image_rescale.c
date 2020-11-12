//
// Created by TYTY on 2020-08-13 013.
//
// use rescaler from libwebp

#include "header/webp/rescaler_utils.h"
#include "cimg.h"

bool RescaleImage(Frame *src, Frame* dst, u32 x, u32 y, u32 w, u32 h) {
  WebPRescaler rescaler;
  u32 l = 0;
  rescaler_t *work = (rescaler_t *)malloc(2ULL * dst->width * 3 * sizeof(*work));

  if (dst->depth != 8 || FormatChannelCount(dst->format) != 3 || dst->pixel == NULL) {
    return false;
  }

  Frame* source = src;
  if (source->depth == 16) {
    Frame* tmp = (Frame *)malloc(sizeof(Frame));
    tmp->width = source->width;
    tmp->height = source->height;
    tmp->format = source->format;
    tmp->depth = 8;
    tmp->pixel = NULL;
    tmp->stride = 0;

    AllocateFrame(tmp);

    CloneFrame(src, tmp, 0, 0, src->width, src->height);
    source = tmp;
  }

  if (FormatChannelCount(source->format) == 4) {
    Frame* tmp = (Frame *)malloc(sizeof(Frame));
    tmp->width = source->width;
    tmp->height = source->height;
    tmp->format = FORMAT_RGB;
    tmp->depth = 8;
    tmp->pixel = NULL;
    tmp->stride = 0;

    AllocateFrame(tmp);

    BlendImageAlpha(source, tmp, 0xffffffffu);

    if (source != src) {
      ReleaseFrame(source);
      free(source);
    }

    source = tmp;
  }

  WebPRescalerInit(&rescaler, w, h,
                   dst->pixel, dst->width, dst->height, dst->stride,
                   3, work);
  while (l < h) {
    l += WebPRescalerImport(&rescaler, h - l,
                            source->pixel + (l + y) * source->stride + 3 * x, source->stride);
    WebPRescalerExport(&rescaler);
  }

  free(work);
  if (source != src) {
    ReleaseFrame(source);
    free(source);
  }

  return true;
}