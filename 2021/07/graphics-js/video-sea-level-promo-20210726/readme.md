#video-sea-level-promo-20210726

This project contains video promos for the [sea level rise + Silicon Valley story](https://apps.npr.org/sea-level-rise-silicon-valley/). The promos are intended for use on the NPR.org homepage and click through to the larger project.

The videos are stored on S3. To retrieve them, run this command in dailygraphics-next:

```
node cli sync video-sea-level-promo-20210726
```

The files will download to the `synced/` folder in this project.
