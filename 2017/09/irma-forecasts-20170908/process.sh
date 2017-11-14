#!/bin/bash

# SET VARIABLES
FOLDER='assets'
COUNT=`ls -l $FOLDER/frames/*.png | wc -l`

# CONVERT FRAMES TO A FILMSTRIP
montage -border 0 -geometry 1000x -tile x2 -quality 80% $FOLDER'/frames/*.png' $FOLDER'/filmstrip-1000.jpg'
montage -border 0 -geometry 600x -tile x2 -quality 70% $FOLDER'/frames/*.png' $FOLDER'/filmstrip-600.jpg'
montage -border 0 -geometry 375x -tile x2 -quality 60% $FOLDER'/frames/*.png' $FOLDER'/filmstrip-375.jpg'

# CONVERT FRAMES TO GIF
# Note: To change the animation speed, tweak the first number in the "delay" value. Lower = faster.
# (Default of 30x60 means each frame displays for 1/2 second. 60x60 == one second.)
convert -background white -alpha remove -reverse -layers optimize-plus -delay 30x60 -resize 600 $FOLDER'/frames/*.png' -loop 0 $FOLDER'/filmstrip.gif'
