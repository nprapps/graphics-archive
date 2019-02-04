# Prison Comic

This webcomic, by Elissa Nadworny and LA Johnson, was published on NPR.org as ["Getting A College Education, Behind Bars"](https://www.npr.org/sections/ed/2018/12/04/592860649/prisoncomics) on Dec. 4, 2018.

### Lazy-loading

The comic exists as a series of lazy-loaded images, incorporating these additional libraries:

```
js/lib/imagesloaded.pkgd.js
js/lib/pymchild-scroll-visibility.v1.js
```

(Documentation: [pymchild-scroll-visibility](https://github.com/nprapps/pymchild-scroll-visibility))

The lazy-loading relies on data attributes to determine the appropriate `desktop` or `mobile` image to pull. In `child_template.html`, it looks like this:

```
<div class="embed-image">
    <div id="lazy-image-{{n}}" class="image-wrapper" data-src-desktop="assets/frames/desktop-{{ n }}.jpg" data-src-mobile="assets/frames/mobile-{{ n }}.jpg">
        <img src="" alt="" />
    </div>
</div>
```

### Image processing

This graphic also includes an image resizing script (`process.sh`) that uses `imagemagick` to composite all the pages and generate tiles for desktop and mobile.

Before doing anything, make sure to sync assets (in the `dailygraphics` terminal pane) so you have all of the relevant image files.

```
fab assets.sync:prison-comic-20181130
```

To run the image resizing script (in the `graphics` terminal pane):

```
cd prison-comic-20181130
bash process.sh
```

The source files are in `/assets/private/src` and are named numerically. The tiled images are saved to `/assets/frames`.


### CMS hacks

In Seamus, the following settings apply:

- Do not syndicate (to prevent this from being distributed to station sites, where it would effectively be a blank page)
- Force mobile external open (to force this to pop open in a mobile browser on the NPR iOS app)

Additionally, since effectively the whole story is the comic, I've added a line of text in the story text just in case this story appears somewhere (like the NPR Android app or, in limited cases, in the iOS app) divorced from the embed.

```
This story contains media that can't be displayed here. [View on NPR.org](https://n.pr/2rgWWDz).
```

(Of note: This is a bit.ly link to the story's published URL to trick the iOS app into seeing this as a non-NPR.org link and pop it up in a mobile browser.)

This line of story text, as well as the story headline, pubdate, byline and other meta info, are hidden via overridecss: https://www.npr.org/include/overridecss/id592860649.css

The CSS is backed up in the [cssoverrides repo](https://github.com/nprapps/cssoverrides), used with [overlorde](https://github.com/nprapps/overlorde/).

Important caveats to share with engagement editors:

- This story will not work natively on the NPR app for iOS. It is set up to pop up in a mobile browser if someone finds it via the app.
- This will not work on Apple News. It shouldn't be promoted there.
- Same with station sites. (Though I'm setting this to "do not syndicate," so hopefully that won't be an issue.)
- The Seamus headline, dateline, bylines and all story text are hidden for users of NPR.org.
- If you open the page in Seamus, you will see a line of text about how media features on this page are not showing up. This is a fallback message for folks who somehow get to the story on the NPR Android app and in other places that aren't caught by the "Do Not Syndicate" flag. Users of NPR.org should not see this message. (This was a fallback option we used for the election results pages, where, similarly, the whole page was embedded multimedia.)
- Also of note with this fallback text: There is a link to the published URL for this story on NPR.org. This link will work when the story is published.
