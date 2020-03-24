# photo-lasvegas-20190926

This graphic uses the "Portrait Pullquotes" template.

Copy your original images to the `photos` folder inside this project. Keep the originals safe somewhere until you're sure you don't need them anymore.

Then, to resize them, navigate to the folder in terminal and run following ImageMagick script:

```
for f in *.jpg; do convert $f -resize 1000x\> -quality 60 $f; done
```

(This will overwrite the images with the resized versions.)

The script above will resize the images down to 1000px wide. Adjust this as necessary for your project. (Consider 1600px if this will be in NPR's "wide" template.)
