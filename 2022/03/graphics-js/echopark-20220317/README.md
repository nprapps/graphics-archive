#echopark-20220317

This project contains photo/video diptychs for a story about the relationship between press and police in Los Angeles.

The media files are stored on S3. To retrieve them, run this command in dailygraphics-next:

```
node cli sync echopark-20220317
```

The files will download to the `synced/` folder in this project.

Resizing images
---------------

Use ImageMagick to resize the JPGs.

```
for f in *.jpg; do convert $f -quality 75 -resize 1000x1000\> -strip -sampling-factor 4:2:0 -define jpeg:dct-method=float -interlace Plane ../$f; done
```


Downsampling video
-------------------

Use `ffmpeg` to scale down outsize video, where `-i` specifies the input filename and the final line specifies the output filename.

```
ffmpeg \
-i monterrosa-echo.mp4 \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=600:-1 \
../monterrosa-echo.mp4
```

Note: If you get a `height not divisible by 2` error, adjust the `-vf scale=900:-1 \` value until you no longer get that error.


Generating a poster image
-------------------------

Use `ffmpeg` to generate a static poster image for the video.

```
ffmpeg \
-i monterrosa-echo.mp4 \
-frames:v 1 \
../monterrosa-echo-poster.jpg
```


Video player icons
------------------

Source: [Google Material Design icon library](https://fonts.google.com/icons?selected=Material+Icons&icon.category=av&icon.style=Filled)
