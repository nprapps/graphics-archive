ai2html Graphic
===============

The ai2html template uses an open-source script called [ai2html](http://ai2html.org/) to convert Illustrator graphics to HTML and CSS and display them in our responsive dailygraphics template.

(This assumes you have already set up the dailygraphics-next rig and have it running on your computer. You can find more information about setting up the rig in the [dailygraphics-next documentation](https://github.com/nprapps/dailygraphics-next).)

How this project is set up
--------------------------

This particular project contains three ai2html graphics, set up as three separate embeds. How this was set up:

**Illustrator files**

In the `/assets` folder of this project, there is one Illustrator file for each graphic (with multiple artboards inside each corresponding to different viewports).

To the right of the "wide" viewport, there is a text box with a variety of configuration variables. Edit the very last one, `project_name` to give it descriptive slug. When you run the ai2html script, this slug will be used for the HTML partial filename, for a `div` ID and in the CSS.

Examples:

```
project_name: _ai2html-groundrules
project_name: _ai2html-trial
project_name: _ai2html-vote
```

_(Prefixing the project name with an underscore will keep dailygraphics-next from confusing the ai2html partial for a standalone embed. It will not appear as an option in the drop-down of graphics in this project. This is correct -- We're making a proper shell for it coming up.)_

**_content.html**

Set the filename for the include to be a variable rather than a hard-coded filename.

```
<%= await t.include(ai2html) %>
```

**index.html**

Modify the call for `_content.html` to pass the `COPY` object and a variable corresponding to the ai2html HTML partial you want to pull in.

```
<%= await t.include("_content.html", { 'COPY': COPY, 'ai2html': '_ai2html-groundrules.html' }) %>
<%= await t.include("_content.html", { 'COPY': COPY, 'ai2html': '_ai2html-trial.html' }) %>
<%= await t.include("_content.html", { 'COPY': COPY, 'ai2html': '_ai2html-vote.html' }) %>
```

**Additional graphic embeds**

Duplicate `index.html`, rename it something intuitive (`trial.html`, `vote.html`), and, in the line that references the ai2html include, fill in the corresponding filename.

**graphic.less**

There are three media queries. Make sure that each graphic in your project is represented in each media query. For example:

```
@media screen and (min-width: 730px) {
    #g-_ai2html-groundrules-small, #g-_ai2html-groundrules-medium { display: none; }
    #g-_ai2html-trial-small, #g-_ai2html-trial-medium { display: none; }
    #g-_ai2html-vote-small, #g-_ai2html-vote-medium { display: none; }
}
```

Installing ai2html
------------------

To use this template, you'll need to install ai2html as an Illustrator
script. Copy [the latest version of the script here](https://github.com/nprapps/dailygraphics/blob/master/etc/ai2html.jsx)
into the Illustrator folder on your machine where scripts are located.
For example, on Mac OS X running Adobe Illustrator CC 2019, the path would be:
`/Applications/Adobe Illustrator CC 2019/Presets.localized/en_US/Scripts/ai2html.jsx`

**You only need to install the script once on your machine.** To check whether you have it installed, open Adobe Illustrator and look for the "ai2html" command in File >> Scripts.

Creating a new ai2html graphic
------------------------------

To create a new ai2html graphic, click the "new()" button in the toolbar and select "Ai2html Graphic" from the list of templates. You'll also need to provide a slug for the graphic--this will have the current date in YYYYMMDD format appended to it, to prevent collisions.

Once you click through, the rig will create a new folder and copy the template files into it. It will also make a duplicate of the template's assigned Google Sheet, for loading labels and data. Finally, it'll take you to the graphic preview page.

The basic ai2html project includes an Illustrator file in `assets`, which you'll use to create your graphic. The three artboards in the file are the three breakpoints for your graphic, allowing you to create custom versions for mobile, tablet and desktop-sized screens. (If you want to change the width of these artboards, you'll need to adjust the media queries in `graphic.less`.)

You can only use fonts that are supported on our website, so make sure
you are using the correct typeface and weight. [Here's a list of
supported fonts](https://github.com/nprapps/dailygraphics/blob/master/etc/ai2html.jsx#L592-L605). (For users outside of NPR, refer to the [ai2html docs](http://ai2html.org/#using-fonts-other-than-arial-and-georgia) to learn how to customize your fonts.)

Create your graphic within Illustrator, referring to the [ai2html
documentation](http://ai2html.org/#how-to-use-ai2html) for help. When
you're ready to export, run File >> Scripts >> ai2html. The resulting
graphic will appear within the base template when you load the preview!
