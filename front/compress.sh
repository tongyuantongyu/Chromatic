# used packages and licenses already included.
rm 3rdpartylicenses.txt
# minify html. should be fine with this aggressive settings as we are not going to edit it
html-minifier --collapse-whitespace \
              --remove-attribute-quotes \
              --remove-redundant-attributes \
              --remove-script-type-attributes \
              --remove-style-link-type-attributes \
              --remove-empty-attributes \
              --minify-css \
              -o index.html index.html
# minify manifest json
minify-json manifest.json

mkdir tmp
cp ./*.css tmp
cp ./*.js tmp
cp ./*.json tmp
cp ./*.html tmp
cp ./*.xml tmp
cp ./*.map tmp

(
  cd tmp || exit
  printf "%s\0" * | xargs -0 -P 6 -I @ brotli -o "@.br" "@"
  mv ./*.br ../
  cp ../*.ico ./
  printf "%s\0" * | xargs -0 -P 6 -I @ zopfli --i5 "@"
  mv ./*.gz ../
  cd ..
)

rm -r tmp
