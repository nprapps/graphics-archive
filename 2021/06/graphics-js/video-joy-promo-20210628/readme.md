#video-joy-promo-20210628

This project contains video promos for the [Joy Generator](https://apps.npr.org/joy-generator/). The promos are intended for use on the NPR.org homepage and click through to the larger project.

The videos are stored on S3. To retrieve them, run this command in dailygraphics-next:

```
node cli sync video-joy-promo-20210628
```

The files will download to the `synced/` folder in this project.
