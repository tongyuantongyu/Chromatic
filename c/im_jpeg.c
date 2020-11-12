//
// Created by TYTY on 2020-08-12 012.
//

#include "cimg.h"

#include <stdio.h>
#include <setjmp.h>
#include <memory.h>

#ifdef WIN32
#include "header/jpeg/jpeglib.h"
#else
#include <jpeglib.h>
#endif


// stuffs copied from libavif
struct my_error_mgr
{
  struct jpeg_error_mgr p;
  jmp_buf setjmp_buffer;
};
typedef struct my_error_mgr * my_error_ptr;
static void my_error_exit(j_common_ptr cinfo)
{
  my_error_ptr myerr = (my_error_ptr)cinfo->err;
//  (*cinfo->err->output_message)(cinfo);
  longjmp(myerr->setjmp_buffer, 1);
}

// from https://cloudinary.com/blog/progressive_jpegs_and_green_martians
const jpeg_scan_info scans[5] = {{
  .comps_in_scan = 3,
  .component_index = {0, 1, 2},
  .Ss = 0, .Se = 0, .Ah = 0, .Al = 0
}, {
  .comps_in_scan = 1,
  .component_index = {0},
  .Ss = 1, .Se = 9, .Ah = 0, .Al = 0
}, {
  .comps_in_scan = 1,
  .component_index = {2},
  .Ss = 1, .Se = 63, .Ah = 0, .Al = 0
}, {
  .comps_in_scan = 1,
  .component_index = {1},
  .Ss = 1, .Se = 63, .Ah = 0, .Al = 0
}, {
  .comps_in_scan = 1,
  .component_index = {0},
  .Ss = 10, .Se = 63, .Ah = 0, .Al = 0
}};

i32 JPEGQualityTransform(u8 quality) {
  if (quality > 100) {
    return 100;
  } else if (quality > 15) {
    return 0.70588235294117647059 * quality + 29.411764705882352941;
  } else if (quality > 1) {
    return 2.1428571428571428571 * quality + 7.8571428571428571429;
  } else {
    return 10;
  }
}

bool IsJPEG(const u8 *data, size_t size, u32* width, u32* height) {
  bool readResult = false;

  struct my_error_mgr jerr;
  struct jpeg_decompress_struct cinfo;
  cinfo.err = jpeg_std_error(&jerr.p);
  jerr.p.error_exit = my_error_exit;
  if (setjmp(jerr.setjmp_buffer)) {
    goto cleanup;
  }

  jpeg_create_decompress(&cinfo);

  jpeg_mem_src(&cinfo, data, size);
  if (jpeg_read_header(&cinfo, FALSE) != JPEG_HEADER_OK) {
    goto cleanup;
  }

  jpeg_calc_output_dimensions(&cinfo);

  *width = cinfo.output_width;
  *height = cinfo.output_height;

  readResult = true;

  cleanup:
  jpeg_destroy_decompress(&cinfo);
  return readResult;
}

bool DecJPEG(const u8 *data, size_t size, Frame *img) {
  if (data == NULL || img == NULL || size < 16) {
    return false;
  }

  bool readResult = false;

  struct my_error_mgr jerr;
  struct jpeg_decompress_struct cinfo;
  cinfo.err = jpeg_std_error(&jerr.p);
  jerr.p.error_exit = my_error_exit;
  if (setjmp(jerr.setjmp_buffer)) {
    goto cleanup;
  }

  jpeg_create_decompress(&cinfo);

  jpeg_mem_src(&cinfo, data, size);
  jpeg_read_header(&cinfo, TRUE);
  cinfo.out_color_space = JCS_EXT_RGB;
  jpeg_start_decompress(&cinfo);

  u32 row_stride = cinfo.output_width * cinfo.output_components;
  JSAMPARRAY buffer = (*cinfo.mem->alloc_sarray)((j_common_ptr)&cinfo, JPOOL_IMAGE, row_stride, 1);

  img->width = cinfo.output_width;
  img->height = cinfo.output_height;
  img->format = FORMAT_RGB;
  img->depth = 8;
  // proper image quality need to be read using other way
  img->quality = 90;

  if (img->width > GetMaxSize() || img->height > GetMaxSize()) {
    goto cleanup;
  }

  AllocateFrame(img);

  int row = 0;
  while (cinfo.output_scanline < cinfo.output_height) {
    jpeg_read_scanlines(&cinfo, buffer, 1);
    u8* pixelRow = img->pixel + row * img->stride;
    memcpy(pixelRow, buffer[0], img->stride);
    ++row;
  }

  jpeg_finish_decompress(&cinfo);
  readResult = true;

cleanup:
  jpeg_destroy_decompress(&cinfo);

  if (!readResult) {
    ReleaseFrame(img);
  }

  return readResult;
}

bool EncJPEG(u8** data, size_t* size, Frame *img) {
  if (img == NULL || img->format == FORMAT_UNDEFINED || img->pixel == NULL) {
    return false;
  }

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

  if (FormatChannelCount(src->format) == 4) {

    Frame* tmp = (Frame *)malloc(sizeof(Frame));
    tmp->width = src->width;
    tmp->height = src->height;
    tmp->format = FORMAT_RGB;
    tmp->depth = 8;
    tmp->pixel = NULL;
    tmp->stride = 0;

    AllocateFrame(tmp);

    BlendImageAlpha(src, tmp, 0xffffffffu);

    if (src != img) {
      ReleaseFrame(src);
      free(src);
    }

    src = tmp;
  }

  src->quality = img->quality;

  struct jpeg_compress_struct cinfo;
  struct jpeg_error_mgr jerr;
  JSAMPROW row_pointer[1];
  cinfo.err = jpeg_std_error(&jerr);
  jpeg_create_compress(&cinfo);

  jpeg_mem_dest(&cinfo, data, (unsigned long *) size);

  cinfo.image_width = src->width;
  cinfo.image_height = src->height;
  cinfo.input_components = 3;
  cinfo.in_color_space = JCS_RGB;
  jpeg_set_defaults(&cinfo);
  i32 quality = JPEGQualityTransform(Quality(src->width, src->height, src->quality));
  jpeg_set_quality(&cinfo, quality, TRUE);

  jpeg_scan_info *scan_ptr = (jpeg_scan_info *)
      (cinfo.mem->alloc_small) ((j_common_ptr) &cinfo, JPOOL_IMAGE,
                                  5 * sizeof(jpeg_scan_info));
  memcpy(scan_ptr, scans, 5 * sizeof(jpeg_scan_info));
  cinfo.scan_info = scan_ptr;
  cinfo.num_scans = 5;
  jpeg_c_set_bool_param(&cinfo, JBOOLEAN_OPTIMIZE_SCANS, FALSE);

  jpeg_start_compress(&cinfo, TRUE);

  while (cinfo.next_scanline < cinfo.image_height) {
    row_pointer[0] = src->pixel + cinfo.next_scanline * src->stride;
    (void)jpeg_write_scanlines(&cinfo, row_pointer, 1);
  }

  jpeg_finish_compress(&cinfo);

  jpeg_destroy_compress(&cinfo);
  if (src != img) {
    ReleaseFrame(src);
    free(src);
  }

  return true;
}

