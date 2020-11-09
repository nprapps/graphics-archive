# covid-couples-20200720

Use this ImageMagick script to resize the images:

```
for f in *.jpg; do convert $f -quality 75 -resize 1600x1200\> -strip -sampling-factor 4:2:0 -define jpeg:dct-method=float -interlace Plane resized/$f; done
```

Save the resized images in the `photos` folder in this project. Do not keep the original high-res images here.
