//
// Created by TYTY on 2020-08-08 008.
//

#include "utils.h"

inline void helper_recurrent(u32* cur, u32* pre, u32 mul) {
  u32 tmp = mul * *cur + *pre;
  *pre = *cur;
  *cur = tmp;
}

// rationalize number into fraction using continue fraction
void Rationalize(double number, u32* num, u32* den, u32 max) {
  u32 num_cur = (u32)number;
  u32 den_cur = 1;

  *num = 1;
  *den = 0;

  number = number - num_cur;

  while (*den < max && den_cur > *den) {
    number = 1 / number;
    if (number > (1ull << 32u)) {
      // number overflow. current estimate is extremely good.
      *den = den_cur;
      *num = num_cur;
      break;
    }

    u32 a = (u32) number;

    helper_recurrent(&num_cur, num, a);
    helper_recurrent(&den_cur, den, a);

    number = number - a;
  }
}