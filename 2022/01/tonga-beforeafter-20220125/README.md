# tonga-beforeafter-20220125

### Optimizing images

Use this ImageMagick script to resize the original images:

```
for f in *.jpg; do convert $f -quality 75 -resize 1600x1200\> -strip -sampling-factor 4:2:0 -define jpeg:dct-method=float -interlace Plane resized/$f; done
```

Save the resized images in the `synced` folder in this project.

### Synced files

For this project, images are synced to S3 rather than stored in the repo. Run this to retrieve / sync them:

```
node cli sync tonga-beforeafter-20220125
```
