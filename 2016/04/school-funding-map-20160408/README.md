# Review of school funding graphic tech

### Map

- **QGIS** to join/filter data and output shapefile
- **Mapbox Studio** for creating vector tiles
	- Styles apply to each layer, so in order to color the polygons differently, we need five data layers that filter on the bin number
	- Also applying a filter on the district type (primary/secondary), which can be toggled client-side
- **MapboxGL.js** for loading and handling vector tiles client-side
	- We can [filter the shapes](js/graphic.js#L263) displayed on each layer, but it can be kind of slow
	- Weird stuff to know about:
		- Due to the nature of vector tiles, your data is only loaded when the polygon is visible on the screen. So it's not exactly trivial to zoom to/select a shape based on id if it's not on the map. To [get around this](js/graphic.js#L343), the map zooms first to the state (we've [loaded these bounding boxes](js/graphic.js#L988) already) and then locates the district on the visible map.
		- There's a [similar issue](js/graphic.js#L357) with the delay required to animate the map from one place to another.
		- Loading the full map at once would be loading the entire dataset with all the corresponding polygons, so Mapbox actually sets a limit on the amount of data that can be displayed at once. This means our zoomed-out mobile view is hard to do with vector tiles. Instead, the mobile map just uses a static image in place of the map.
		- Since styles apply to entire layers, doing interaction-based styles like applying a stroke to a polygon on hover require a separate layer of outlines that are filtered to match what the user is hovering over


### Histograms

- R scripts for parsing data
	- I needed to group together all the districts > $40k. So I did that filtering in R before plotting the frequency data as a histogram.
	- **ggplot2** allows you to access the underlying data when you create a histogram, so I output that to a CSV.
- Since I'm bad at R and like making things complicated, I used a [Python script](data/datautils/create_hist.py) to do some extra parsing and formatting of the histogram data and export as JSON.
- **D3.js** to draw the histograms


### Geolocating/custom paragraph

- We [geolocate users](js/graphic.js#L933) to the state level with GeoIP and use that to zoom in to their state
- We also use this info in a paragraph that leads into the graphic from the story text
	- But! Member stations don't want this paragraph, since it's styled to look like an NPR story. So the Seamus embed (but not the default/member station embeds) actually includes a [URL parameter that lets us differentiate](js/graphic.js#L214).
	- The URL being iframed in is actually:

				http://apps.npr.org/dailygraphics/graphics/school-funding-map-20160408/child.html?hasGeoText=true&initialWidth=1149&childId=responsive-embed-school-funding-map-20160408&parentUrl=http%3A%2F%2Fwww.npr.org%2F2016%2F04%2F14%2F474256366%2Fwhy-americas-schools-have-a-money-problem%3Flive%3D1


### What can we improve on?

- Documentation/resources
	- Right now our data scripts, data, shapefiles, graphic files, etc. are all in different places -- important to consolidate in some way for preservation's sake?
		- Use the assets rig for any of these files?
	- We have some documentation of the data analysis/shapefile creation process, but not a ton
	- Maybe I should put this in the project as a README
- UX stuff
	- For geolocating, we should cache user location in LocalStorage
	- Map hover outlines
- **What else?**
	- Learn the process from QGIS in PostGIS instead so it can be scripted
		- Faster to load into PostGIS db instead of into memory
		- This allows your data process to be edited
	- We should write tests for stuff like this!
	- Should this have been in its own repo?
		- Should we start putting every graphic in its own repo?
	- Tracking more custom events in GA -- not everything, but something like "did this event happen once"
