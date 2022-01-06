#bruces-beach-diptychs-20210920

This project contains photo/video diptychs for a story about Bruce's Beach in California.

The media files are stored on S3. To retrieve them, run this command in dailygraphics-next:

```
node cli sync bruces-beach-diptychs-20210920
```

The files will download to the `synced/` folder in this project.

Resizing images
---------------

Use ImageMagick to resize the JPGs.

```
for f in *.jpg; do convert $f -quality 75 -resize 1000x1000\> -strip -sampling-factor 4:2:0 -define jpeg:dct-method=float -interlace Plane resized/$f; done
```


Downsampling video
-------------------

Use `ffmpeg` to scale down outsize video, where `-i` specifies the input filename and the final line specifies the output filename.

```
ffmpeg \
-i BeachWaves_Loop.mov \
-ss 0 -t 5 \
-an \
-vcodec libx264 \
-acodec mp2 \
-preset veryslow \
-strict -2 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=750:-1 \
resized/BeachWaves_Loop.mp4
```

Note: If you get a `height not divisible by 2` error, adjust the `-vf scale=900:-1 \` value until you no longer get that error.
