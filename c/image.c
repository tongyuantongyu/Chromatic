//
// Created by TYTY on 2020-08-06 006.
//

#include "cimg.h"
#include <memory.h>
#include <malloc.h>

bool AllocateFrame(Frame *img) {
  // already allocated
  if (img->pixel != NULL) {
    return false;
  }

  // invalid dimension
  if (img->width == 0 || img->height == 0) {
    return false;
  }

  // invalid depth
  if (img->depth < 8 || img->depth > 16) {
    return false;
  }

  if (img->format == FORMAT_UNDEFINED) {
    return false;
  }

  const u32 pixelSize = img->depth > 8 ? 2 : 1;

  if (img->stride != 0) {
    // explicit set stride
    if (img->stride < img->width * pixelSize) {
      return false;
    }
  } else {
    img->stride = img->width * pixelSize * FormatChannelCount(img->format);
  }

  u8* mem = (u8*)malloc((size_t)img->stride * img->height * FormatChannelCount(img->format));

  // allocation failed
  if (mem == NULL) {
    return false;
  }

  img->pixel = mem;
  return true;
}

bool ZeroFrame(Frame *img, u32 x, u32 y, u32 w, u32 h) {
  if (img->pixel == NULL) {
    return false;
  }

  const u32 step = FormatChannelCount(img->format) * (img->depth >> 3u);

  for (u32 i = 0; i < h; i++) {
    memset(img->pixel + img->stride * (y + i) + step * x, 0, step * w);
  }

  return true;
}

static inline u32 MakeARGB32(u32 r, u32 g, u32 b, u32 a) {
  return ((a << 24u) | (r << 16u) | (g << 8u) | b);
}

static inline u32 MakeABGR32(u32 r, u32 g, u32 b, u32 a) {
  return ((a << 24u) | (b << 16u) | (g << 8u) | r);
}

static inline u32 MakeRGBA32(u32 r, u32 g, u32 b, u32 a) {
  return ((r << 24u) | (g << 16u) | (b << 8u) | a);
}

static inline u32 MakeBGRA32(u32 r, u32 g, u32 b, u32 a) {
  return ((b << 24u) | (g << 16u) | (r << 8u) | a);
}


bool FillFrame(Frame *img, u32 x, u32 y, u32 w, u32 h, u8 r, u8 g, u8 b, u8 a) {
  if (img->pixel == NULL) {
    return false;
  }

  // no 16bit now
  if (img->depth != 8) {
    return false;
  }

  if (img->format == FORMAT_UNDEFINED) {
    return false;
  }

  if (img->format >> 31u) {
    u32 fill;
    switch (img->format) {
      case FORMAT_RGBA:
        fill = MakeRGBA32(r, g, b, a);
        break;
      case FORMAT_BGRA:
        fill = MakeBGRA32(r, g, b, a);
        break;
      case FORMAT_ARGB:
        fill = MakeARGB32(r, g, b, a);
        break;
      case FORMAT_ABGR:
        fill = MakeABGR32(r, g, b, a);
        break;
      default:
        return false;
    }
    for (u32 i = y; i < y + h; i++) {
      for (u32 j = x; j < x + w; j++) {
        *(u32 *)(img->pixel + i * img->stride + j * 4) = fill;
      }
    }
  } else {
    switch (img->format) {
      case FORMAT_RGB:
        for (u32 i = y; i < y + h; i++) {
          for (u32 j = x; j < x + w; j++) {
            u8* pos = img->pixel + i * img->stride + j * 3;
            *(pos + 0) = r;
            *(pos + 1) = g;
            *(pos + 2) = b;
          }
        }
        break;
      case FORMAT_BGR:
        for (u32 i = y; i < y + h; i++) {
          for (u32 j = x; j < x + w; j++) {
            u8* pos = img->pixel + i * img->stride + j * 3;
            *(pos + 0) = b;
            *(pos + 1) = g;
            *(pos + 2) = r;
          }
        }
        break;
      default:
        return false;
    }
  }

  return true;
}

bool ReleaseFrame(Frame *img) {
  if (img->pixel == NULL) {
    return false;
  }

  free(img->pixel);
  img->pixel = NULL;
  return true;
}

bool CloneFrame(Frame *src, Frame *dst, u32 x, u32 y, u32 w, u32 h) {
  if (src->format != dst->format) {
    return false;
  }

  const u32 step = FormatChannelCount(src->format);

  if (src->depth == 8 && dst->depth == 8) {
    for (u32 l = 0; l < h; l++) {
      u8* sp = src->pixel + l * src->stride;
      u8* dp = dst->pixel + (l + y) * dst->stride + x * step;

      memcpy(dp, sp, w * step);
    }
    return true;
  } else if (src->depth == 16 && dst->depth == 16) {
    for (u32 l = 0; l < h; l++) {
      u16* sp = (u16 *)src->pixel + l * src->stride;
      u16* dp = (u16 *)dst->pixel + (l + y) * dst->stride + x * step;

      memcpy(dp, sp, w * step * 2);
    }
    return true;
  } else if (src->depth == 16 && dst->depth == 8) {
    for (u32 l = 0; l < h; l++) {
      u16* sp = (u16 *)(src->pixel + l * src->stride);
      u8* dp = dst->pixel + (l + y) * dst->stride + x * step;

      for (u32 c = 0; c < w * step; c++) {
        *(dp + c) = (*(sp + c)) >> 8u;
      }
    }
    return true;
  } else if (src->depth == 8 && dst->depth == 16) {
    for (u32 l = 0; l < h; l++) {
      u8* sp = src->pixel + l * src->stride;
      u16* dp = (u16 *)(dst->pixel + (l + y) * dst->stride + x * step);

      for (u32 c = 0; c < w * step; c++) {
        *(dp + c) = (*(sp + c)) << 8u;
      }
    }
    return true;
  } else {
    return false;
  }
}

bool BlendFrame(Frame *src, Frame *dst, u32 x, u32 y, u32 w, u32 h) {
  if (src->format != dst->format) {
    return false;
  }

  if (FormatChannelCount(src->format) == 3) {
    return CloneFrame(src, dst, x, y, w, h);
  }

  u32 i, j;
  u32 u, v, al;

  if (src->depth == 8 && dst->depth == 8) {
    for (u32 l = 0; l < h; l++) {
      u8* sp = src->pixel + l * src->stride;
      u8* dp = dst->pixel + (l + y) * dst->stride + x * 4;

      for (i = 0; i < w; i++, sp += 4, dp += 4) {
        if (sp[3] == 255) {
          memcpy(dp, sp, 4);
        } else if (sp[3] != 0) {
          if (dp[3] != 0) {
            u = sp[3]*255;
            v = (255-sp[3])*dp[3];
            al = u + v;
            dp[0] = (sp[0]*u + dp[0]*v)/al;
            dp[1] = (sp[1]*u + dp[1]*v)/al;
            dp[2] = (sp[2]*u + dp[2]*v)/al;
            dp[3] = al/255;
          } else {
            memcpy(dp, sp, 4);
          }
        }
      }
    }
    return true;
  } else if (src->depth == 16 && dst->depth == 16) {
    for (u32 l = 0; l < h; l++) {
      u16* sp = (u16 *)src->pixel + l * src->stride;
      u16* dp = (u16 *)dst->pixel + (l + y) * dst->stride + x * 4;

      for (i = 0; i < w; i++, sp += 4, dp += 4) {
        if (sp[3] == 65535) {
          memcpy(dp, sp, 8);
        } else if (sp[3] != 0) {
          if (dp[3] != 0) {
            u = sp[3]*65535;
            v = (65535-sp[3])*dp[3];
            al = u + v;
            dp[0] = (sp[0]*u + dp[0]*v)/al;
            dp[1] = (sp[1]*u + dp[1]*v)/al;
            dp[2] = (sp[2]*u + dp[2]*v)/al;
            dp[3] = al/65535;
          } else {
            memcpy(dp, sp, 8);
          }
        }
      }
    }
    return true;
  } else if (src->depth == 16 && dst->depth == 8) {
    for (u32 l = 0; l < h; l++) {
      u16* sp = (u16 *)src->pixel + l * src->stride;
      u8* dp = dst->pixel + (l + y) * dst->stride + x * 4;

      for (i = 0; i < w; i++, sp += 4, dp += 4) {
        if (sp[3] == 65535) {
          dp[0] = sp[0] >> 8u;
          dp[1] = sp[1] >> 8u;
          dp[2] = sp[2] >> 8u;
          dp[3] = sp[3] >> 8u;
        } else if (sp[3] != 0) {
          if (dp[3] != 0) {
            u = sp[3]*65535;
            v = (65535-sp[3])*(dp[3]<<8u);
            al = u + v;
            dp[0] = ((sp[0]*u + (dp[0]<<8u)*v)/al) >> 8u;
            dp[1] = ((sp[1]*u + (dp[1]<<8u)*v)/al) >> 8u;
            dp[2] = ((sp[2]*u + (dp[2]<<8u)*v)/al) >> 8u;
            dp[3] = (al / 65535) >> 8u;
          } else {
            dp[0] = sp[0] >> 8u;
            dp[1] = sp[1] >> 8u;
            dp[2] = sp[2] >> 8u;
            dp[3] = sp[3] >> 8u;
          }
        }
      }
    }
    return true;
  } else if (src->depth == 8 && dst->depth == 16) {
    for (u32 l = 0; l < h; l++) {
      u8* sp = src->pixel + l * src->stride;
      u16* dp = (u16 *)dst->pixel + (l + y) * dst->stride + x * 4;

      for (i = 0; i < w; i++, sp += 4, dp += 4) {
        if (sp[3] == 255) {
          dp[0] = sp[0] << 8u;
          dp[1] = sp[1] << 8u;
          dp[2] = sp[2] << 8u;
          dp[3] = sp[3] << 8u;
        } else if (sp[3] != 0) {
          if (dp[3] != 0) {
            u = (sp[3]<<8u)*65535;
            v = (65535-(sp[3]<<8u))*dp[3];
            al = u + v;
            dp[0] = ((sp[0]<<8u)*u + dp[0]*v)/al;
            dp[1] = ((sp[1]<<8u)*u + dp[1]*v)/al;
            dp[2] = ((sp[2]<<8u)*u + dp[2]*v)/al;
            dp[3] = al/65535;
          } else {
            dp[0] = sp[0] << 8u;
            dp[1] = sp[1] << 8u;
            dp[2] = sp[2] << 8u;
            dp[3] = sp[3] << 8u;
          }
        }
      }
    }
    return true;
  } else {
    return false;
  }
}

#define BLEND(V0, V1, ALPHA) \
    ((((V0) * (255 - (ALPHA)) + (V1) * (ALPHA)) * 0x101 + 256) >> 16u)

bool BlendImageAlpha(Frame *src, Frame *dst, u32 background_rgb) {
  const u32 red = (background_rgb >> 16u) & 0xffu;
  const u32 green = (background_rgb >> 8u) & 0xffu;
  const u32 blue = (background_rgb >> 0u) & 0xffu;

  // we are blending
  if (FormatChannelCount(src->format) != 4 || FormatChannelCount(dst->format) != 3){
    return false;
  }

  // can't deal different size
  if (src->width != dst->width || src->height != dst->height) {
    return false;
  }

  // can't deal 16bit now
  if (src->depth == 16 || dst->depth == 16) {
    return false;
  }

  for (u32 l = 0; l < src->height; l++) {
    u8* sp = src->pixel + l * src->stride;
    u8* dp = dst->pixel + l * dst->stride;

    for (u32 i = 0; i < src->width; i++, sp += 4, dp += 3) {
      if (sp[3] == 255) {
        dp[0] = sp[0];
        dp[1] = sp[1];
        dp[2] = sp[2];
      } else if (sp[3] == 0) {
        dp[0] = red;
        dp[1] = green;
        dp[2] = blue;
      } else {
        dp[0] = BLEND(red, sp[0], sp[3]);
        dp[1] = BLEND(green, sp[1], sp[3]);
        dp[2] = BLEND(blue, sp[2], sp[3]);
      }
    }
  }

  return true;
}

//void ReleaseImage(Image *img) {
//  if (img->i) {
//    if (!img->animation) {
//      ReleaseFrame(img->i);
//    } else {
//      for (int j = 0; j < img->frames; ++j) {
//        if (img->i + j != NULL) {
//          ReleaseFrame(img->i + j);
//        }
//      }
//    }
//    free(img->i);
//  }
//}