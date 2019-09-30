# Soundscape portraits

This is **one of six portraits** in a story about attitudes toward porn that ran on NPR.org in May 2019. Since the portraits all share styles and functionality, the CSS and JS actually point to the same CSS and JS files for each graphic.

**NOTE: This project folder contains the CSS and JS that affect all
twelve portraits. Any changes will appear on the others in the set! Alter
these files with care.**

---------

### Image processing

This graphic also includes an image processing script (`process.sh`) that uses `imagemagick` to resize images for desktop and mobile.

Before doing anything, make sure to sync assets (in the `dailygraphics` terminal pane) so you have all of the relevant image files.

```
fab assets.sync:soundscape-blacklung-20190122
```

To run the image resizing script (in the `graphics` terminal pane):

```
cd soundscape-blacklung-20190122
bash process.sh
```

The source files are in `/assets/private/originals` and are named numerically. The tiled images are saved to `/assets/images`.


### Lazy loading

This project incorporates these additional libraries:

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

Additionally, using the Pym scroll visibility tracker requires the `data-pym-trackscroll` data attribute on the embed code. Each graphic has a custom `parent.html` file that includes this param as part of the suggested embed code.


### CMS hacks

In Seamus, the following setting applies:

- Force mobile external open (to force this to pop open in a mobile browser on the NPR iOS app)

Important caveats to share with engagement editors:

- The "click for sound" images in the story will not work natively on the NPR app for iOS. The story is set up to pop up in a mobile browser if someone finds it via the app.
- The "click for sound" images will not show up on Apple News. However static images and story text should work. Keep this in mind when weighing whether this story should be promoted there.
- Same with station sites that do not Core Publisher.
