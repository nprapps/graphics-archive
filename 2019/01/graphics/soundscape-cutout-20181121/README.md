# Soundscape portraits

This is **one of twelve portraits** in a story about life-size cutouts and grief that ran in NPR's "The Picture Show" blog. Since the portraits all share styles and
functionality, the CSS and JS actually point to the same CSS and JS files for each graphic.

Each project also points to [the same spreadsheet](https://docs.google.com/spreadsheets/d/1jewDpnsAQ9oh73U3sGMDrUQb5v3SBLT2kpLrRZve-wc/edit#gid=0), for ease of editing.

**NOTE: This project folder contains the CSS and JS that affect all
twelve portraits. Any changes will appear on the others in the set! Alter
these files with care.**

---------

### Image processing

This graphic also includes an image processing script (`process.sh`) that uses `imagemagick` to resize images for desktop and mobile.

Before doing anything, make sure to sync assets (in the `dailygraphics` terminal pane) so you have all of the relevant image files.

```
fab assets.sync:soundscape-cutout-20181121
```

To run the image resizing script (in the `graphics` terminal pane):

```
cd soundscape-cutout-20181121
bash process.sh
```

The source files are in `/assets/private/originals` and are named numerically. The tiled images are saved to `/assets/images`.


### CMS hacks

In Seamus, the following setting applies:

- Force mobile external open (to force this to pop open in a mobile browser on the NPR iOS app)

Important caveats to share with engagement editors:

- The "click for sound" images in the story will not work natively on the NPR app for iOS. The story is set up to pop up in a mobile browser if someone finds it via the app.
- The "click for sound" images will not show up on Apple News. However static images and story text should work. Keep this in mind when weighing whether this story should be promoted there.
- Same with station sites.
