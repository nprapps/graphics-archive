# pandemic-postcards-20200614

Images
------

The original images live in this GDrive folder: https://drive.google.com/drive/u/1/folders/1X2So-TDgeC3eW1_J8KPcnj2DIjgbUB59 (May need to request access from LA on the Ed team.)

Use this ImageMagick script to resize the images:

```
for f in *.jpg; do convert $f -quality 75 -resize 1000x1000\> -strip -sampling-factor 4:2:0 -define jpeg:dct-method=float -interlace Plane resized/$f; done
```

Save the resized images in the `img` folder in this project. Do not keep the original high-res images here.

Analytics
---------

The Google Analytics events tracked in this project are:

|Category|Action|Label|Value|
|--------|------|-----|-----|
|pandemic-postcards-20200614|postcard-clicked|postcard ID||
|pandemic-postcards-20200614|total-clicked|# of postcards clicked so far in the session||
