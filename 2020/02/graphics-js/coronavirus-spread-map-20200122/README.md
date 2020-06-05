### How it's set up

The map is a basic ai2html style map with a few caveats. The choropleth layer is generated via mapshaper and svgexport, and loaded into the .ai file as a png, that's (ideally) locked in place. If you want to edit these, follow the directions below.


### How to update the basemaps (and map in general) with new virus counts

1. Update the data found in `combined_data.csv`
1. Go to https://drive.google.com/open?id=1mtF67DEbOj79LUffz0WAXP4IeK2tlsKC to download the necessary shp files. 
1. Place the unzipped `/raw_map_data/` folder in your `./assets/` folder.
1. Create a `/worked/` folder in your `./assets/` folder.
1. From the `./assets/` folder, run each command, located in `tasks.sh`. 
	- NOTE: some of these steps (creating the reproject+clipped versions of china+countries only needs to happen one time)
	- NOTE: The joining of the files may not work 100% correctly, so make sure names are correct.
	- NOTE: Small entities (Macau, Hong Kong, Shanghai, etc.) are updated by hand in the google doc, and injected into map as text.
1. Open up `map.ai` and make sure the linked .png files are updated. If not, re-link them BUT DON'T MOVE THE MAPS!!!
1. Run ai2html to see new map.
1. Update small entities, in the google doc. 
	- NOTE: I've experimented here with some css styles on how to highlight these places. Feel free to futz with the classes and how I'm doing that. 

### How to update data when things in place:
1. Copy data from pdf to google doc in new tab with date
1. Add new countries to the `Names` tab.
1. Add a new row for China, and sum the total numbers for China (include Macau and Hong Kong in China's total).
1. Update U.S. numbers from [CDC](https://www.cdc.gov/coronavirus/2019-ncov/cases-in-us.html), if it is Monday, Wednesday or Friday. Add up total cases with cases from Wuhan and Diamond Princess. On Tuesday and Thursday, get U.S. numbers from [Johns Hopkins](https://www.arcgis.com/apps/opsdashboard/index.html#/bda7594740fd40299423467b48e9ecf6). 
1. Get travel advisory data [here](https://wwwnc.cdc.gov/travel/notices). Input the alert level (0-3) in the `travel_advisory` column.
1. Sort data by province, then Special Admin, then country, then within that by count, then within that alphabetically.
1. Copy that data over into `combined_data.csv`.
1. In `./assets/`, run the `tasks.sh` command for the East Asia map, `worldTasks.sh` for the world map, and `warningTasks.sh` for the travel warning map.
1. Open `map.ai`, `robinson.ai` and `warning_world.ai` and and make sure the linked .png files are updated. Run ai2html on each of these.
1. Update Labels section of google doc, including date/footnotes, which countries not visible, etc. 
1. Republish with permission from editor (Malaka or Marc)