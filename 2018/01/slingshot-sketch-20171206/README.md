Slingshot 2018 Artists Grid
===========================

What is this?
-------------

A visual display of all 2018 Slingshot artists that appears at the top of the 2018 Slingshot Artists Page.

What's in here?
---------------

Besides the typical dailygraphics assets, here are a few things that are specific to this graphic.

* `font` - Icon fonts generated with [Fontello](http://fontello.com/). We use some icons from [Font Awesome](http://fontawesome.io/) for the chevrons in the navigation controls.
* `fontello/config.json` - Icon font configuration. You can upload this to Fontello to update or regenerate the icon font build.
* `js/lib/flickity.pkgd.js` - [Flickity](https://flickity.metafizzy.co/). We use this to show the artists as a swipeable carousel on narrow displays.
* `css/lib/flickity.less` - Styles for carousel container elements.
* `css/lib/fontello.less` - Styles for icon fonts.

Custom configuration
--------------------

These are custom configuration variables that are specific to this graphic.

### Small image width

Used to specify the width, in pixels of the smallest image size.

We specify multiple image sizes for use with `srcset` to let the browser determine the appropriate size image for different displays. For more on the use of `srcset`, see [this article](https://css-tricks.com/responsive-images-youre-just-changing-resolutions-use-srcset/).

You'll probably want to use this in a formula in the `data` worksheet to calculate the image URL.

#### `labels` worksheet key

`image_width_small`

### Example value

`500`

### Medium image width

Used to specify the width, in pixels of the medium image size.

We specify multiple image sizes for use with `srcset` to let the browser determine the appropriate size image for different displays. For more on the use of `srcset`, see [this article](https://css-tricks.com/responsive-images-youre-just-changing-resolutions-use-srcset/).

You'll probably want to use this in a formula in the `data` worksheet to calculate the image URL.

#### `labels` worksheet key

`image_width_medium`

### Example value

`700`

### Artists URL

**This is an experimental feature for testing purposes only.**

URL to the Slingshot artists page on npr.org with special characters replaced.

This setting is designed to allow supporting this graphic being embedded on sites other than npr.org, but where the links will link back to npr.org.

The value can be specified either as a query parameter to the Pym.js child URL.

#### Query parameter

`artistsUrl`

#### Example value

`https%3A%2F%2Fwww.npr.org%2F570751142%26live%3D1`

That's the escaped version of `https://www.npr.org/570751142&live=1`

In order to accomodate query parameters, i.e. `live=1`, in the URL that is itself a query parameter, we have to replace special characters in the URL with their `%xx` escape. You can do this in the Python shell like:

```
$ python3
Python 3.6.2 (default, Jul 17 2017, 16:44:45)
[GCC 4.2.1 Compatible Apple LLVM 8.1.0 (clang-802.0.42)] on darwin
Type "help", "copyright", "credits" or "license" for more information.
>>> import urllib.parse
>>> urllib.parse.quote_plus('https://www.npr.org/570751142&live=1')
'https%3A%2F%2Fwww.npr.org%2F570751142%26live%3D1'
```

#### Usage example

```
<p data-pym-loader data-child-src="https://apps.npr.org/dailygraphics/graphics/slingshot-sketch-20171206/child.html?artistsUrl=https%3A%2F%2Fwww.npr.org%2F570751142%26live%3D1" id="responsive-embed-slingshot-sketch-20171206">Loading...</p><script type="text/javascript" src="https://pym.nprapps.org/npr-pym-loader.v2.min.js"></script>
```


Spreadsheet schema
------------------

Like most dailygraphics projects, the data that drives this graphic lives in the `data` worksheet of the graphic's spreasdheet.

However, the data for this graphic will be updated throughout 2018, so we're documenting the fields here.

A few things to keep in mind:

* Avoid using formulas in fields that will be rendered. Instead, calculate them in a separate column and copy values over. This makes it easier to move data around without worrying about breaking formulas and the data.
* Fields beginning with `_`, for example `_char_count` are for internal use only and aren't rendered.

### `name`

Name of the artist.

Type: string

Example value: `Bedouine`

###	`order`

Order in which the artist will be rendered in the collection. Lower numbers will be rendered first.

This allows us to control the order that artists are displayed in the collection and allows the order of rows in the spreadsheet and the rendered HTML to be different.

Type: integer

Example value: `5`

###	`gist`

Brief, attention-grabbing statement about an artist. This should match the text displayed in the artist detail page in Seamus.

Type: string

Example value: `His father was a preacher who swayed him to the spiritual side of music; his original sound mines high-energy, thoughtful rock 'n' roll.`

###	`station`

Name of the station that contributed this artist.

Type: string

Example values:

* `Vocalo`
* `WFUV`

###	`image`

URL of image that will be rendered in an `<img>` tag for the artist.

This should match the image used in the artist detail entry in Seamus to be a consistent visual cue for the reader.

Type: string

Example value: `https://media.npr.org/assets/img/2017/12/29/bedouine-press-photo-2-by-polly-antonia-barrowman-hires_wide-922ba63f65cc3f1ca49d27238c354fb7819cddf2.jpg`

### `image_initial`

Tiny version of the artist image that will be rendered initially in the `<img>` tag for the artist. We use CSS and JavaScript to achieve a "blue up" effect.  See [this article](https://jmperezperez.com/medium-image-progressive-loading-placeholder/) for more on the technique.

Type: string

Example value: `https://media.npr.org/assets/img/2017/12/29/air_credits_photo_by_jfrankvisuals_wide-5cbbf25cd50ee273703477b405e1063edbb92e45-s20-c10.jpg`

Note the small `s` (size) and `c` (compression) parameters in the URL.

### `image_medium`

URL of image that will be given as an option in the `srcset` of the `<img>` tag for the artist.

Type: string

Example value: `https://media.npr.org/assets/img/2017/12/29/air_credits_photo_by_jfrankvisuals_wide-5cbbf25cd50ee273703477b405e1063edbb92e45-s700-c80.jpg`

###	`slug`

Slugified version of the artist name. This is used to create the link to the artist detail anchor. So, it's important that this match the anchor value in Seamus.

Type: string

Example value: `haley-heynderickx`

###	`gist_type`

Some gists might be a quote from the artist or a song lyric. This lets us indicate if the gist is one of these, in case we want to style it differently.

Type: string

Valid values:

* `[empty string]`
* `quote`

Example value: `quote`

###	`_char_count`

Utility field that uses a formula to get the character count of `gist`. This might be useful in tweaking element dimensions in the CSS.

Type: formula returning integer

Example formula: `=len(C2)`

Example value: `131`

###	`_slug_computed`

Utility field that uses a formula to get a slugified version of the artist's name. The values in this column can then be copied and pasted into `slug`. I created this to avoid typos that might occur if I manually entered a slug.

Type: formula returning string

Example formula: `=REGEXREPLACE(REGEXREPLACE(LOWER(A2), "[.]+", ""), "\s+", "-")`

Example value: `haley-heynderickx`

###	`_image_path`

Utility field that holds the media.npr.org path of the artist image copied from `npr.org`. Instructions for obtaining this path are available in [Cropping and linking to an image in Seamus](http://localhost:6419/#cropping-and-linking-to-an-image-in-seamus).

That image path may contain parameters (see http://confluence.npr.org/display/PMO/Image+Scales+and+QA+Resources) to adjust the image size and quality. We might want to strip or change those in the value we use for `image` and we might use a spreadsheet formula for that. Preserving the original path lets us play with things without losing data and having to look up an image URL again.

Type: string

Example value: `/assets/img/2017/12/29/air_credits_photo_by_jfrankvisuals_sq-68273f76d58034fc287b15e8e36fd13217d0c820-s200.jpg`

###	`_image_raw_url`

Utility field that computes the media.npr.org image URL of the artist image copied from `npr.org`.

That image URL will likely contain parameters (see http://confluence.npr.org/display/PMO/Image+Scales+and+QA+Resources) to adjust the image size and quality. We might want to strip or change those in the value we use for `image` and we might use a spreadsheet formula for that. Preserving the original URL lets us play with things without losing data and having to look up an image URL again.

Type: string

Example value: `https://media.npr.org/assets/img/2017/12/29/air_credits_photo_by_jfrankvisuals_wide-5cbbf25cd50ee273703477b405e1063edbb92e45-s2000-c85.jpg`

### `_image_initial_computed`

Utility field that holds the image URL from `_image_raw_url` but with the size and quality parameters replaced by a formula.

You should be able to copy the values from this column into the `image_initial` column.

Type: formula returning string

Example formula: `=REGEXREPLACE($L2,"-s\d+-c\d+\.(jp[e]{0,1}g)", CONCATENATE("-s", 20, "-c", 10, ".$1"))`

Example value: `https://media.npr.org/assets/img/2017/12/29/air_credits_photo_by_jfrankvisuals_wide-5cbbf25cd50ee273703477b405e1063edbb92e45-s20-c10.jpg`

###	`_image_small_computed`

Utility field that holds the image URL from `_image_raw_url` but with the size and quality parameters replaced by a formula.

You should be able to copy the values from this column into the `image` column.

The formula will probably want to reference the cell containing the value corresponding to the `image_width_small` key in the `labels` worksheet.

Type: formula returning string

Example formula: `=REGEXREPLACE($L2,"-s\d+-c\d+\.(jp[e]{0,1}g)", CONCATENATE("-s", labels!$B$8, "-c", labels!$B$10, ".$1"))`

Example value: `https://media.npr.org/assets/img/2017/12/29/air_credits_photo_by_jfrankvisuals_wide-5cbbf25cd50ee273703477b405e1063edbb92e45-s500-c80.jpg`

###	`_image_medium_computed`

Utility field that holds the image URL from `_image_raw_url` but with the size and quality parameters replaced by a formula.

You should be able to copy the values from this column into the `image` column.

The formula will probably want to reference the cell containing the value corresponding to the `image_width_medium` key in the `labels` worksheet.

Type: formula returning string

Example formula: `=REGEXREPLACE($L2,"-s\d+-c\d+\.(jp[e]{0,1}g)", CONCATENATE("-s", labels!$B$9, "-c", labels!$B$10, ".$1"))`

Example value: `https://media.npr.org/assets/img/2017/12/29/air_credits_photo_by_jfrankvisuals_wide-5cbbf25cd50ee273703477b405e1063edbb92e45-s700-c80.jpg`


Adding a new artist to the grid
-------------------------------

To add a new artist to the grid, add a row containing the artist's
information as laid out by the [spreadsheet
schema](#spreadsheet-schema). To fill in the image paths, you will need
to crop an image in Seamus based on the image being used in the
storytext.

### Cropping and linking to an image in Seamus

In the Seamus post, locate the artist's image within the storytext.
Click `Edit Image` and navigate one step backward to `Adjust crops`.
Select the Square crop, adjust the dimensions accordingly and hit
`Perform crop`. Then navigate to the next screen.

Along the top row of different crops, select `Square` and copy the path that appears below. (e.g. `/assets/img/2018/01/24/octavian3_sq.jpg`)
Paste that into the artist's `_image_path` cell. The next four cells
(`_image_raw_url`, `_image_initial_computed`, `_image_small_computed`
and `_image_medium_computed`) should then populate with URLs for
different sizes and compression levels of the image.

Copy the computed cells and paste the values into the `image_initial`, `image`
and `image_medium` cells.


Analytics
---------

We track a number of custom events to better understand how users interact with this graphic.

Our approach is guided by the questions we've outlined in the [analytics report document](https://docs.google.com/document/d/17s7FuXxkgzfg-7dYrmY3tENcDQXhCZllQLTK5758Shg/edit)

|Category|Action|Example Label|Value|Description|
|--------|------|-----|-----|-----|
|slingshot-sketch-20171206|click-artist-grid-slug|`knox-fortune`||Indicates that a user has clicked an artist link in the grid (desktop) display and which artist they clicked|
|slingshot-sketch-20171206|click-artist-grid-index|`3`||Indicates that a user has clicked an artist link in the grid (desktop) display and the index of the clicjed artist in the collection|
|slingshot-sketch-20171206|click-artist-deck-slug|`knox-fortune`||Indicates that a user has clicked an artist link in the deck (mobile) display and which artist they clicked|
|slingshot-sketch-20171206|click-artist-deck-index|`3`||Indicates that a user has clicked an artist link in the deck (mobile) display and the index of the clicjed artist in the collection|
|slingshot-sketch-20171206|click-artist-total-clicks|`5`||Indicates the total number of clicks, including the current click, that a user has clicked so far in their session|
|slingshot-sketch-20171206|view-artist-card-slug|`air-credits`||Indicates that a user has viewed an artist's card in the deck view|
|slingshot-sketch-20171206|view-artist-card-index|`3`||Indicates that a user has viewed an artist's card at a particular index in the deck view|
|slingshot-sketch-20171206|click-next|`4`||Indicates that a user has clicked the next button in the deck view while viewing the artist at a particular index.|
|slingshot-sketch-20171206|click-prev|`5`||Indicates that a user has clicked the previous button in the deck view while viewing the artist at a particular index.|

Notes on design decisions
-------------------------

There are a few areas of this project's design that warrant further exploration.

### Touch interactions across all devices

The graphic currently offers two modes: a grid of artists featuring
details on mouseover, and a Flickity-powered carousel that provides
details below each artist's image. These are based on screen size
breakpoints alone. That means a user on a large touch-enabled screen
(such as an iPad Pro or a touchscreen laptop) would still get the grid,
but would be unable to hover on grid items through touch interactions
alone.

Ideally, in a case of a user having a large enough screen to view the
grid, an initial touch of an item would highlight it, then a second
touch would navigate to the target. This would be the default behavior
if we were using regular anchor tags with a `:hover` class, but we can't
use those elements as navigation for content outside of a Pym embed.

We mostly ran out of time to address this, but I was also hesitant to
define this interaction based on whether a user's browser has touch
enabled or not. I'd like to assume that some users have the ability to
interact through both touch and mouse events, so our code shouldn't shut
off one kind of event just because it detects the other is
available.

In the future, I think I would approach the grid interactions this way:

1. Listen for `touchstart` and `touchend` on the grid collection and
   set a state variable for `userIsTouching`.
2. On `click`, check for `userIsTouching == true`. If so, and if the
   artist is not already highlighted, run the mouseover function
   instead. Otherwise, run the click function.

*Update: after revisiting [this article](https://www.html5rocks.com/en/mobile/touchandmouse/) I'm actually not sure this order of events will work -- it seems that `touchend` may be fired before `click` ever is. Will revisit this...*

I think that would support the two-step interaction for touch-enabled
devices without assuming that a user can't also use a mouse. I have not
yet tested this, though.

Two helpful resources I came across while researching this:

- [Touch and Mouse](https://www.html5rocks.com/en/mobile/touchandmouse/)
- [The only way to detect touch with JavaScript](https://codeburst.io/the-only-way-to-detect-touch-with-javascript-7791a3346685) (Smart premise but a little sanctimonious at times)

