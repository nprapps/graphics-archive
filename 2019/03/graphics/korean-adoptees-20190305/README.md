# Korean Adoptees Portraits

This project involves a series of designed pullquotes and lazy-loaded images.

This is **one of ten portraits** in a story about Korean-American/Korean-Canadian
identity. Since the portraits all share styles and functionality, the CSS and JS
point to the same CSS and JS files for each graphic.

Each project also points to [the same spreadsheet](https://docs.google.com/spreadsheets/d/1wHSUOo86dqTu1AOR5_8ZpQO0IQPKHm9_nSPN0pE1Wrg/edit#gid=1401251923), for ease of editing.

**NOTE: This project folder contains the CSS and JS that affect all
ten portraits. Any changes will appear on the others in the set! Alter
these files with care.**

All of the slugs associated with this project:

```
korean-adoptees-20190305,korean-adoptees-01-20190305,korean-adoptees-02-20190305,korean-adoptees-03-20190305,korean-adoptees-04-20190305,korean-adoptees-05-20190305,korean-adoptees-06-20190305,korean-adoptees-07-20190305,korean-adoptees-08-20190305,korean-adoptees-09-20190305,korean-adoptees-10-20190305
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
