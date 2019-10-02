# Civility Portraits

This project involves a series of designed pullquotes and lazy-loaded images.

This is **one of five embeds** in a story about civility. Since the portraits
all share styles and functionality, the CSS and JS
point to the same CSS and JS files for each graphic.

Each project also points to [the same spreadsheet](https://docs.google.com/spreadsheets/d/1J3lkcuhiKCGyETZ0HAH7G_hxg9w1H0aRbnBbI7SrFJ8/edit#gid=1401251923), for ease of editing.

**NOTE: This project folder contains the CSS and JS that affect all
ten portraits. Any changes will appear on the others in the set! Alter
these files with care.**

All of the slugs associated with this project:

```
civility-20190409,civility-01-20190409,civility-02-20190409,civility-03-20190409,civility-04-20190409,civility-05-20190409
```

-----------

This project involves a series of designed pullquotes and lazy-loaded images.

It incorporates these additional libraries:

```
js/lib/imagesloaded.pkgd.js
js/lib/pymchild-scroll-visibility.v1.js
```

(Documentation: [pymchild-scroll-visibility](https://github.com/nprapps/pymchild-scroll-visibility))

The lazy-loading relies on data attributes to determine the appropriate `desktop` or `mobile` image to pull. In `child_template.html`, it looks like this:

```
<div id="lazy-image-{{ row.idx }}" class="lazy-wrapper" data-src-desktop="assets/desktop/{{ row.filename }}" data-src-mobile="assets/mobile/{{ row.filename }}">
    <img src=""  alt="Portrait of {{ row.name }}">
</div>
```

There is an image resizing script that uses `imagemagick` to resize the source images to 1600px wide for desktop and 900px wide for mobile.

Before doing anything, make sure to sync assets (in the `dailygraphics` terminal pane) so you have all of the relevant image files.

```
fab assets.sync:korean-adoptees-20190305
```

To run the image resizing script (in the `graphics` terminal pane):

```
cd korean-adoptees-20190305
bash process.sh
```
