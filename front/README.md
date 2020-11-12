# Frontend project for Chromatic image hosting server

## Build

To build this project, follow the steps below.

1. Make sure you have npm installed.
2. Replace the value `recaptchaKey` in `src/environments/environments.prod.json` with your own **Website Key**.
3. Use `npm install` to get all dependencies installed.
4. Use `ng build --prod` to get a build ready for production.
5. (Optional) Execute `compress.sh` in `dist/front` to get brotli and gzip compressed static files.
