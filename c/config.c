//
// Created by TYTY on 2020-08-07 007.
//

#include "cimg.h"

static u32 MAX_SIZE = 0;
static u32 MAX_THREAD = 0;

void SetMaxSize(u32 size) {
  MAX_SIZE = size;
}

u32 GetMaxSize() {
  return MAX_SIZE;
}

void SetMaxThread(u32 thread) {
  MAX_THREAD = thread;
}

u32 GetMaxThread() {
  return MAX_THREAD;
}

u32 Quality(u32 width, u32 height, u8 quality) {
  u32 size = width > height ? width : height;
  if (size > MAX_SIZE) {
    return -1;
  }
  if (2 * size > MAX_SIZE) {
    return quality > 80 ? 80 : quality;
  } else if (4 * size > MAX_SIZE) {
    return quality > 90 ? 90 : quality;
  } else {
    return quality;
  }
}