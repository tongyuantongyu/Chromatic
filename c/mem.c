//
// Created by TYTY on 2020-09-13 013.
//

#include "cimg.h"
#include <malloc.h>

bool TrimMemory() {
  #ifdef __GLIBC__
  return malloc_trim(0);
  #else
  return true;
  #endif
}