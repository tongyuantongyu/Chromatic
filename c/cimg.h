#ifndef C_LIBRARY_H
#define C_LIBRARY_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>
#include <stdlib.h>

// defines
typedef int8_t i8;
typedef uint8_t u8;

typedef int16_t i16;
typedef uint16_t u16;

typedef int32_t i32;
typedef uint32_t u32;

typedef int64_t i64;
typedef uint64_t u64;

#if defined(__GNUC__) && __GNUC__ >= 4
#  define pub __attribute__ ((visibility ("default")))
#  define really_inline inline __attribute__((always_inline))
#elif defined(_MSC_VER)
#  define pub __declspec(dllexport)
#  define really_inline inline __forceinline
#else
#  define pub
#  define really_inline inline
#endif  /* __GNUC__ >= 4 */

// settings
pub void SetMaxSize(u32 size);

pub u32 GetMaxSize();

pub void SetMaxThread(u32 thread);

pub u32 GetMaxThread();

pub u32 Quality(u32 width, u32 height, u8 quality);

// types
typedef enum ImageFormat {
  FORMAT_UNDEFINED = 0,
  FORMAT_RGB = 1,
  FORMAT_BGR,

  FORMAT_RGBA = (1u << 31u) + 1,
  FORMAT_BGRA,
  FORMAT_ARGB,
  FORMAT_ABGR
} ImageFormat;

really_inline u8 FormatChannelCount(ImageFormat format) {
  return format ? ((format >> 31u) ? 4 : 3) : 0;
}

typedef struct Frame {
  u32 width;
  u32 height;
  u8 depth;
  ImageFormat format;
  u8 quality;

  u8* pixel; // real type depends on depth
  u32 stride;
} Frame;

// frame utils
pub bool AllocateFrame(Frame *img);

pub bool ReleaseFrame(Frame *img);

pub bool ZeroFrame(Frame *img, u32 x, u32 y, u32 w, u32 h);

pub bool CloneFrame(Frame *src, Frame *dst, u32 x, u32 y, u32 w, u32 h);

pub bool BlendFrame(Frame *src, Frame *dst, u32 x, u32 y, u32 w, u32 h);

pub bool BlendImageAlpha(Frame *src, Frame *dst, u32 background_rgb);

pub bool RescaleImage(Frame *src, Frame* dst, u32 x, u32 y, u32 w, u32 h);

// png utils
pub bool IsPNG(const u8 *data, size_t size, u32* width, u32* height);

pub bool DecPNG(const u8* data, size_t size, Frame* img);

//jpeg utils
pub bool IsJPEG(const u8 *data, size_t size, u32* width, u32* height);

pub bool DecJPEG(const u8 *data, size_t size, Frame *img);

pub bool EncJPEG(u8** data, size_t* size, Frame *img);

//webp utils
pub bool IsWEBP(const u8 *data, size_t size, u32* width, u32* height);

pub bool DecWEBP(const u8* data, size_t size, Frame* img);

pub bool EncWEBP(u8** data, size_t* size, Frame *img);

pub int QualityWEBP(const u8* data, size_t size);

//avif utils
pub bool IsAVIF(const u8 *data, size_t size, u32* width, u32* height);

pub bool DecAVIF(const u8 *data, size_t size, Frame *img);

pub bool EncAVIF(u8** data, size_t* size, Frame *img);

//mem utils

pub bool TrimMemory();
#endif //C_LIBRARY_H
