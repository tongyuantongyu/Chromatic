package native

// for build with rav1e: #cgo windows LDFLAGS: -lavif_rav1e -lrav1e -lws2_32 -luserenv

// #cgo CFLAGS: -I./../c/
// #cgo !windows CFLAGS: -I/opt/mozjpeg/include/
// #cgo LDFLAGS: -L${SRCDIR}/../c/debug/
// #cgo windows LDFLAGS: -L${SRCDIR}/../c/libs/
// #cgo !windows LDFLAGS: -L/opt/mozjpeg/lib64/
// #cgo LDFLAGS: -static -lcImg -lavif -laom -ldav1d -lwebp -lwebpdemux -ljpeg -lpng -lz
// #cgo windows LDFLAGS: -lwinpthread
// #cgo !windows LDFLAGS: -lm -ldl -lpthread -lc
// #include "cimg.h"
import "C"

import (
	"log"
	"runtime"
	"unsafe"
)
import "github.com/liut/jpegquality"

type CFrame C.struct_Frame

type Frame struct {
	f CFrame
}

func (f *Frame) W() uint32 {
	return uint32(f.f.width)
}

func (f *Frame) H() uint32 {
	return uint32(f.f.height)
}

func SetMaxSize(size uint32) {
	C.SetMaxSize(C.u32(size))
}

func GetMaxSize() uint32 {
	return uint32(C.GetMaxSize())
}

func SetMaxThread(thread uint32) {
	C.SetMaxThread(C.u32(thread))
}

func GetMaxThread() uint32 {
	return uint32(C.GetMaxThread())
}

func ReleaseFrame(f *Frame) bool {
	log.Printf("Frame %p is about to be released.\n", f)
	return bool(C.ReleaseFrame((*C.struct_Frame)(&f.f)))
}

func IsPNG(data []byte) (bool, uint32, uint32) {
	var w, h C.u32
	r := C.IsPNG((*C.u8)(unsafe.Pointer(&data[0])), C.size_t(len(data)), &w, &h)
	
	if bool(r) {
		return true, uint32(w), uint32(h)
	} else {
		return false, 0, 0
	}
}

func DecPNG(data []byte) *Frame {
	f := &Frame{f: CFrame{}}
	r := C.DecPNG((*C.u8)(unsafe.Pointer(&data[0])), C.size_t(len(data)), (*C.struct_Frame)(&f.f))
	
	runtime.SetFinalizer(f, ReleaseFrame)
	
	if bool(r) {
		return f
	} else {
		return nil
	}
}

func IsJPEG(data []byte) (bool, uint32, uint32) {
	var w, h C.u32
	r := C.IsJPEG((*C.u8)(unsafe.Pointer(&data[0])), C.size_t(len(data)), &w, &h)
	
	if bool(r) {
		return true, uint32(w), uint32(h)
	} else {
		return false, 0, 0
	}
}

func DecJPEG(data []byte) *Frame {
	f := &Frame{f: CFrame{}}
	r := C.DecJPEG((*C.u8)(unsafe.Pointer(&data[0])), C.size_t(len(data)), (*C.struct_Frame)(&f.f))
	
	runtime.SetFinalizer(f, ReleaseFrame)
	
	if bool(r) {
		qF, err := jpegquality.NewWithBytes(data)
		if err != nil {
			return nil
		}
		f.f.quality = C.u8(qF.Quality())
		
		return f
	} else {
		return nil
	}
}

func EncJPEG(f *Frame) []byte {
	var data *C.u8 = nil
	var size C.size_t
	
	r := C.EncJPEG(&data, &size, (*C.struct_Frame)(&f.f))
	
	if data != nil {
		defer C.free(unsafe.Pointer(data))
	}
	
	if !bool(r) {
		return nil
	}
	
	e := make([]byte, size)
	copy(e, ((*[1 << 30]byte)(unsafe.Pointer(data)))[0:size:size])
	
	return e
}

func IsWEBP(data []byte) (bool, uint32, uint32) {
	var w, h C.u32
	r := C.IsWEBP((*C.u8)(unsafe.Pointer(&data[0])), C.size_t(len(data)), &w, &h)
	
	if bool(r) {
		return true, uint32(w), uint32(h)
	} else {
		return false, 0, 0
	}
}

func DecWEBP(data []byte) *Frame {
	f := &Frame{f: CFrame{}}
	r := C.DecWEBP((*C.u8)(unsafe.Pointer(&data[0])), C.size_t(len(data)), (*C.struct_Frame)(&f.f))
	
	runtime.SetFinalizer(f, ReleaseFrame)
	
	if bool(r) {
		return f
	} else {
		return nil
	}
}

func EncWEBP(f *Frame) []byte {
	var data *C.u8 = nil
	var size C.size_t
	
	r := C.EncWEBP(&data, &size, (*C.struct_Frame)(&f.f))
	
	if data != nil {
		defer C.free(unsafe.Pointer(data))
	}
	
	if !bool(r) {
		return nil
	}
	
	e := make([]byte, size)
	copy(e, ((*[1 << 30]byte)(unsafe.Pointer(data)))[0:size:size])
	
	return e
}

func IsAVIF(data []byte) (bool, uint32, uint32) {
	var w, h C.u32
	r := C.IsAVIF((*C.u8)(unsafe.Pointer(&data[0])), C.size_t(len(data)), &w, &h)
	
	if bool(r) {
		return true, uint32(w), uint32(h)
	} else {
		return false, 0, 0
	}
}

func DecAVIF(data []byte) *Frame {
	f := &Frame{f: CFrame{}}
	r := C.DecAVIF((*C.u8)(unsafe.Pointer(&data[0])), C.size_t(len(data)), (*C.struct_Frame)(&f.f))
	
	runtime.SetFinalizer(f, ReleaseFrame)
	
	if bool(r) {
		return f
	} else {
		return nil
	}
}

func EncAVIF(f *Frame) []byte {
	var data *C.u8 = nil
	var size C.size_t
	
	r := C.EncAVIF(&data, &size, (*C.struct_Frame)(&f.f))
	
	if data != nil {
		defer C.free(unsafe.Pointer(data))
	}
	
	if !bool(r) {
		return nil
	}
	
	e := make([]byte, size)
	copy(e, ((*[1 << 30]byte)(unsafe.Pointer(data)))[0:size:size])
	
	return e
}

func RescaleFrame(s *Frame, x, y, ws, hs, wt, ht uint32) *Frame {
	f := &Frame{f: CFrame{
		width: C.u32(wt),
		height: C.u32(ht),
		depth: 8,
		format: C.FORMAT_RGB,
		quality: 100,
	}}
	
	if !bool(C.AllocateFrame((*C.struct_Frame)(&f.f))) {
		return nil
	}
	
	runtime.SetFinalizer(f, ReleaseFrame)
	
	if !bool(C.RescaleImage((*C.struct_Frame)(&s.f), (*C.struct_Frame)(&f.f),
		C.u32(x), C.u32(y), C.u32(ws), C.u32(hs))) {
		return nil
	}
	
	return f
}

func TrimMemory() bool {
	return bool(C.TrimMemory())
}