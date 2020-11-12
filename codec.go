package main

import "ImageServer/native"

var decoders = map[string]func([]byte) *native.Frame{
	"png":  native.DecPNG,
	"webp": native.DecWEBP,
	"avif": native.DecAVIF,
	"jpeg": native.DecJPEG,
}

var detectors = map[string]func([]byte) (bool, uint32, uint32){
	"png":  native.IsPNG,
	"webp": native.IsWEBP,
	"avif": native.IsAVIF,
	"jpeg": native.IsJPEG,
}

var encoders = map[string]func(*native.Frame) []byte{
	"jpeg": native.EncJPEG,
	"webp": native.EncWEBP,
	"avif": native.EncAVIF,
}

func Decode(d []byte, t string) (*native.Frame, string) {
	if detector, exist := detectors[t]; exist {
		ok, width, height := detector(d)
		if !ok || width > uint32(config.Site.MaxSize) || height > uint32(config.Site.MaxSize) {
			return nil, ""
		}
		
		if f := decoders[t](d); f != nil {
			return f, t
		}
	}
	
	for codec, detector := range detectors {
		if codec == t {
			continue
		}
		
		ok, width, height := detector(d)
		if !ok {
			continue
		} else if width > uint32(config.Site.MaxSize) || height > uint32(config.Site.MaxSize) {
			return nil, ""
		}
		
		if f := decoders[codec](d); f != nil {
			return f, codec
		}
	}
	
	return nil, ""
}

func Encode(f *native.Frame, t string) []byte {
	if encoder, exist := encoders[t]; exist {
		return encoder(f)
	} else {
		return nil
	}
}
