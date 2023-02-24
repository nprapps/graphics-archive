#znpp-attack-video-20220309/

This project contains video for a Science Desk story about a Russian attack on a power plant in Ukraine. `index` is intended for use on the story page. `hp` is intended for use on the NPR.org homepage, with a clickthru to the larger project.

The videos and images are stored on S3. To retrieve them, run this command in dailygraphics-next:

```
node cli sync znpp-attack-video-20220309
```

The files will download to the `synced/` folder in this project.

Sampling down video
-------------------

Use `ffmpeg` to scale down outsize video, where `-i` specifies the input filename and the final line specifies the output filename.

```
ffmpeg \
-i CLIP1.mov \
-an \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=1002:-1 \
clip01.mp4

ffmpeg \
-i CLIP1.mov \
-an \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=600:-1 \
clip01-mobile.mp4
```

Generating a poster image
-------------------------

Use `ffmpeg` to generate a static poster image for the video.

```
ffmpeg \
-i Clip-1-antitank-missile.mov \
-frames:v 1 \
clip01-poster.jpg
```
