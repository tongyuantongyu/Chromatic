# Chromatic

Chromatic is a private image hosting site focused on optimizing web experience.

# Requirement

**Run this server on a decent machine!**

Image encoding, especially using libaom for AVIF encoding, requires a lot of CPU and memory resources.
You should have at least 8GB memory for a 4096x4096 size image. 

This site uses MongoDB as database.

## Deploy

To deploy the site, follow the steps below.

1. Get a domain. 
2. Create a reCAPTCHA key for your site. You can get one free at [here](https://www.google.com/recaptcha/admin/create).
3. Copy `config.example.toml` to `config.toml`, and change the config items to your need.
4. Replace default website key (`6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`) to yours in `main.*.js` and `main.*.js.map`.
5. (Optional) Copy and execute `compress.sh` in `static` folder to get brotli and gzip compressed static files.
6. Everything ready. Run the executable to start the server.

## Build

To build this project from source, follow the instructions below.

### Dependence libraries

On Linux, You should have [libpng](http://www.libpng.org/pub/png/libpng.html),
libjpeg([mozjpeg](https://github.com/mozilla/mozjpeg), optimally),
[libwebp](https://chromium.googlesource.com/webm/libwebp) and
[libavif](https://github.com/AOMediaCodec/libavif) installed with headers and
static library available for compiler. Specially, mozjpeg's default install dir
`/opt/mozjpeg/` will also be considered.

On Windows, you should have the same libraries, with headers and libraries
placed in `c/header` and `c/libs`.

### Build C Part

This project has a small wrapper written in C. You need `cmake` to build it.
This can be build on Linux and Windows(using MinGW).

```
cd c
mkdir release
cd release
cmake -DCMAKE_BUILD_TYPE=Release ..
make
```

### Build Go Part

Build Go part is simple.

```
go build -tags=jsoniter .
```

If you want to remove some debug info to reduce executable size, use

```
go build -tags=jsoniter -ldflags="-s -w" ..
```

### Build front-end Part

Please follow the instruction in the `front` folder.
