#glen-canyon-20220104/

This project contains video for a National Desk story about Glen Canyon. `index` is intended for use on the story page. `hp` is intended for use on the NPR.org homepage, with a clickthru to the larger project.

The videos are stored on S3. To retrieve them, run this command in dailygraphics-next:

```
node cli sync glen-canyon-20220104
```

The files will download to the `synced/` folder in this project.

Sampling down video
-------------------

Use `ffmpeg` to scale down outsize video, where `-i` specifies the input filename and the final line specifies the output filename.

The `-ss 1` param trims off the first second — needed to remove a blip from one of the videos.

```
ffmpeg \
-i C0001.mov \
-ss 1 \
-an \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=1002:-1 \
../glen-canyon-01.mp4

ffmpeg \
-i C0001.mov \
-ss 1 \
-an \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=600:-1 \
../glen-canyon-01-mobile.mp4
```
