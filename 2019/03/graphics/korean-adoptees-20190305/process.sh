#!/bin/bash

# SET VARIABLES
SOURCE_FOLDER='assets/private/originals'
DESKTOP_OUTPUT_FOLDER='assets/desktop'
MOBILE_OUTPUT_FOLDER='assets/mobile'

# RESIZE IMAGES FOR DESKTOP
mogrify -path $DESKTOP_OUTPUT_FOLDER -resize 1600 -quality 80 $SOURCE_FOLDER/*.jpg

# RESIZE IMAGES FOR MOBILE
mogrify -path $MOBILE_OUTPUT_FOLDER -resize 900 -quality 80 $SOURCE_FOLDER/*.jpg
