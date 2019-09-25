# East Liverpool, Ohio, Portraits

This is **one of nine portraits** in a story about opioids and East Liverpool,
Ohio, that ran in November 2018. Since the portraits all share styles and
functionality, the CSS and JS actually point to the same CSS and JS
files for each graphic.

Each project also points to [the same spreadsheet](https://docs.google.com/spreadsheets/d/1JDSCFixbAkOaHWuzRPp_pEP66G8iy50S2JjKuVmoFd8/edit#gid=1401251923), for ease of editing.

**NOTE: This project folder contains the CSS and JS that affect all
nine portraits. Any changes will appear on the others in the set! Alter
these files with care.**

All of the slugs associated with this project:

```
liverpool-ohio-20181115,liverpool-cece-20181115,liverpool-brian-20181115,liverpool-shannon-20181115,liverpool-melody-20181115,liverpool-tawnia-20181115,liverpool-glen-20181115,liverpool-josh-20181115,liverpool-mitzie-20181115,liverpool-kelsey-20181115
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
fab assets.sync:liverpool-ohio-20181115
```

To run the image resizing script (in the `graphics` terminal pane):

```
cd liverpool-ohio-20181115
bash process.sh
```
