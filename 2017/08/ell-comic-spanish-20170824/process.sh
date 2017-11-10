#!/bin/bash

# SET VARIABLES
IN_FOLDER='assets/private'
OUT_FOLDER='assets/frames'

# JOIN IMAGES INTO ONE TALL IMAGE
echo 'Combining desktop files into a single image...'
convert $IN_FOLDER'/desktop/desktop-*.jpg' -append $IN_FOLDER'/desktop/combined.jpg'

echo 'Compressing comic images...'
convert -strip -interlace Plane -quality 85% $IN_FOLDER'/desktop/combined.jpg' $IN_FOLDER'/desktop/compressed.jpg'
convert -strip -interlace Plane -quality 85% $IN_FOLDER'/mobile/mobile.jpg' $IN_FOLDER'/mobile/compressed.jpg'

# SLICE IMAGE INTO TILES
echo 'Slicing comics into tiles...'
convert -crop 100%x7% +repage $IN_FOLDER'/desktop/compressed.jpg' $OUT_FOLDER'/desktop.jpg'
convert -crop 100%x7% +repage $IN_FOLDER'/mobile/mobile.jpg' $OUT_FOLDER'/mobile.jpg'

echo 'Done.'
