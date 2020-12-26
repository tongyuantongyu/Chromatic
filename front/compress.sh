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
  for file in *; do brotli -o "$file".br "$file"; done
  mv ./*.br ../
  cp ../*.ico ./
  for file in *; do zopfli --i100 "$file"; done
  mv ./*.gz ../
  cd ..
)

rm -r tmp
