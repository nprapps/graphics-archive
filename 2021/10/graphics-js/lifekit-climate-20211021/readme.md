#lifekit-climate-20211021

This project contains video promos for LifeKit. `index` is intended for use on the story page. `hp` is intended for use on the NPR.org homepage, with a clickthru to the larger project.

The videos are stored on S3. To retrieve them, run this command in dailygraphics-next:

```
node cli sync lifekit-climate-20211021
```

The files will download to the `synced/` folder in this project.

Sampling down video
-------------------

Use `ffmpeg` to scale down outsize video, where `-i` specifies the input filename and the final line specifies the output filename.

```
ffmpeg \
-i climate-anxiety-orig.mp4 \
-an \
-vcodec libx264 \
-preset veryslow \
-strict -2 \
-pix_fmt yuv420p \
-crf 21 \
-vf scale=1002:-1 \
climate-anxiety.mp4
```
