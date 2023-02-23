#tornado-drone-20211222/

This project contains muted looping videos. `index` is intended for use on the story page. `hp` is intended for use on the NPR.org homepage, with a clickthru to the larger project.

The videos are stored on S3. To retrieve them, run this command in dailygraphics-next:

```
node cli sync tornado-drone-20211222
```

The files will download to the `synced/` folder in this project.

Sampling down video
-------------------

Use `ffmpeg` to scale down outsize video, where `-i` specifies the input filename and the final line specifies the output filename. The code below also truncates the video to 20 seconds (the `-t` flag).

```
ffmpeg \
-i Mayfield.mov \
-an \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-t 20 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=1002:-1 \
../mayfield.mp4
```

```
ffmpeg \
-i Mayfield.mov \
-an \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-t 20 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=600:-1 \
../mayfield-mobile.mp4
```
