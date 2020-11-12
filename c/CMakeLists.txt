cmake_minimum_required(VERSION 3.10)
project(cImg C)

set(CMAKE_C_STANDARD 99)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -static")

add_library(cImg STATIC cimg.h config.c image.c im_png.c im_webp.c q_webp.c im_avif.c im_jpeg.c image_rescale.c mem.c)