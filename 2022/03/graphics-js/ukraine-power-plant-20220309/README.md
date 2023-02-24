ukraine-power-plant-20220309
============================

Synced assets
-------------

The Illustrator file and original satellite image for this project live in the `synced` folder. To retrieve them, run this command in dailygraphics-next:

```
node cli sync ukraine-power-plant-20220309
```

ai2html Graphic
---------------

The ai2html template uses an open-source script called [ai2html](http://ai2html.org/) to convert Illustrator graphics to HTML and CSS and display them in our responsive dailygraphics template.

(This assumes you have already set up the dailygraphics-next rig and have it running on your computer. You can find more information about setting up the rig in the [dailygraphics-next documentation](https://github.com/nprapps/dailygraphics-next).)

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

Some tips for making a map
--------------------------

**Potential questions to ask that might be helpful:**
- Does this story need a map?
- Is the data location-based?
- Could this data be shown better in another non-map format?
- What elements are important to include?
- What location markers might be important for people to orient themselves on the map? (ex. highways or buildings for city-level mapping; major cities or physical features for country-level mapping)

**Common workflows for mapmaking:**
- Usually the bulk of the work, like analyzing data or mapping it onto different elements, can be done in a GIS software. [QGIS](https://qgis.org/en/site/) is a good free option to use.
- If you use QGIS in your mapmaking, a collection of NPR style QGIS map templates lives [here](https://github.com/nprapps/qgis-templates). They include styles and base shapefiles, which on their own won't yield finished maps, but can get you most of the way there. The `locator-template` is the most up-to-date template in the repo, and contains styles used in recent locator maps that can be adapted for other maps as well.
- Another more advanced option is using [command line tools](https://moriartynaps.org/command-carto-part-one/) and scripting as steps to join data and map files.
- Then, if additional styling is needed, using or modifying the Illustrator styles in here.

**Here are some good free GIS data sources to pull from:**
- [Natural Earth](https://www.naturalearthdata.com/downloads/) for global cultural, physical and raster data
- [USGS EarthExplorer](https://earthexplorer.usgs.gov/) for global satellite imagery
- [OpenStreetMap](https://wiki.openstreetmap.org/wiki/Downloading_data) for crowd-sourced street level data
- [Esri Open Data Hub](https://hub.arcgis.com/search) for searching for specific datasets
