#yellowstone-flood-20220614/

This project contains video for a National Desk story about Glen Canyon. `index` is intended for use on the story page. `hp` is intended for use on the NPR.org homepage, with a clickthru to the larger project.

The videos are stored on S3. To retrieve them, run this command in dailygraphics-next:

```
node cli sync yellowstone-flood-20220614
```

The files will download to the `synced/` folder in this project.

Sampling down video
-------------------

Use `ffmpeg` to scale down outsize video, where `-i` specifies the input filename and the final line specifies the output filename.

The `-ss 1` param trims off the first second — needed to remove a blip from one of the videos.

```
ffmpeg \
-i 1080p_1.mp4 \
-ss 1 \
-an \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=1002:-1 \
../yellowstone.mp4

ffmpeg \
-i 1080p_1.mp4 \
-ss 1 \
-an \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=600:-1 \
../yellowstone-mobile.mp4
```

Note: If you get a `height not divisible by 2` error, adjust the `-vf scale=1002:-1 \` value until you no longer get that error.


Generating a poster image
-------------------------

Use `ffmpeg` to generate a static poster image for the video.

```
ffmpeg \
-i 1080p_1.mp4 \
-frames:v 1 \
../yellowstone-poster.jpg
```
