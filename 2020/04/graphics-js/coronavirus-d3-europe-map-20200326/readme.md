## [DEPRACATED] Schedule for update 

Map
- We are no longer updating this map, if for any reason it must be updated, see below.

## How the data is set up
- The Europe detail map shares data with the World map (coronavirus-d3-world-map-20200323). Updating the data for the World Map will also update the Europe detail map data. See the World Map README for details on data update (https://github.com/nprapps/graphics-js/blob/master/coronavirus-d3-world-map-20200323/readme.md).


## Steps to update

Update the map & table
- Follow the steps to update the World map data in the World Map README (https://github.com/nprapps/graphics-js/blob/master/coronavirus-d3-world-map-20200323/readme.md). Do the same data sanity checks. (Note: These data are as of midnight-ish ET, so the data we have is a little behind what JHU is showing. This is fine.)
- Sanity-check the updated map (which is running on the DG rig in your computer) with the [published map](https://apps.npr.org/dailygraphics/graphics/coronavirus-d3-europe-map-20200326/preview.html#desktop). If you see some countries that exist in the published map but not in the updated map, it might be because JHU changed the display name of the country in their raw data (e.g. "Bahamas" was changed to "Bahamas, The" once). In this case, change the country's name in `name_jhu` in `daily_countries_total` to whatever the new name is.
- If everything looks good, *redeploy the map*!
