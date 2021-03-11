## Schedule for update

**Map**
- Weekday: 8:30 a.m., 12:30 p.m., 8:30 p.m.
- Weekend: 12 p.m., 8:30p.m.

**Heatmap Table**
- All days: 8:30 p.m.

## Steps to update

#### Update the map and the cases/deaths columns of the table
- There is a script that auto-updates the sheet `_raw_state_data` (and thus the `daily_us_totals` sheet referenced by the map) every 30 minutes.
- Cross-check data in `daily_us_totals` with the [Johns Hopkins dashboard](https://www.arcgis.com/apps/opsdashboard/index.html#/bda7594740fd40299423467b48e9ecf6). It should be up to date, but if there's anything majorly different, (i.e. they've made a big announcement in the last 30 min), you can wait, or you can use the `*_override` columns in `daily_us_totals` to override the death and confirmed column for a particular state.
	- The overall U.S. total on JHU's site will not match our number exactly because it includes cruise ship passengers and we do not. Better to spot-check cases/deaths in a particular state.
	- Note: If you want to hide or show a given state's info on the map, use the `label`, `label_offsetX`, `label_offsetY`, `labelSide` columns in `daily_us_totals` to update this.
- Check that the numbers show up correctly in both graphics (map and table).
- In the `labels` sheet, update the time in the `dataAsOf` location. Ignore `dateUpdated` unless you're updating the heat chart. Add your name to the credit line if you aren't in there yet.
- *Redeploy the chart!*
- Proceed to timeline data update or move below to the communication steps.

#### Update the timeline data (for heatmap table-thing)

Johns Hopkins has deprecated the [data file](https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series) we were using to update this. As a stopgap, here is how we will update the heatmap:

- There should be a COVID menu in the toolbar, with a menu item named "Update state timeline data." Run this item, and it should create a new column in the `_confirmed_time_raw` sheet. Sanity-check some numbers to make sure they match the `daily_us_totals`, then add a new date value in the top row for your new column (incremented by one). For consistency with our previous data, it's important to do the update as close to 8/8:30 ET as possible.
- In the `labels` sheet, update the date to today in the `dateUpdated` field. Don't touch the `dateUpdatedCode` field, which is updated automatically.
- Cross check the graphic to make sure the heatmap looks correct.
- *Redeploy the chart!*

#### After any update
- Update the story page in Seamus
	- Update the story pubdate. (Right column, under "story settings.")
	- If numbers have changed significantly, update the cases and deaths numbers (these tend to be fairly general: "more than 40,000 cases", "more than 400 deaths").
	- Every couple days, or if there has been a significant jump in numbers in a particular state, update the promo image. (How to do this: Use the browser inspector to remove the map's labels and label lines, then take a screenshot of the map. For maximum flexibility when cropping in Seamus, add 500px or so extra of white padding all around in Photoshop before saving the image out for use in Seamus.)
	- Republish the page.
- Notify homepage team on `#homepage` slack that the map is updated. Also tag Carmel in the message.

**Redeploy the chart if you forgot!**

*And you're done!*

## Guide to various sheets

- `labels`: this is labels `¯\_(ツ)_/¯`
- `metadata`: this is for the copyedit email...ignore it i guess.
- `daily_us_totals`: This processed data populates the map the table death/confirmed totals. It pulls from `_raw_state_data`
- `states_confirmed_timeline`: This processed data populates the heat map
- `_raw_state_data`: Raw data from JHU scraped by [this process](https://github.com/nprapps/jhu-map-scraper-corona).
- `states_confirmed_timeline` combines `_consolidated_timeline_raw` for earlier data and `_confirmed_time_raw`.


TKTKTKTKTK

List of possible improvements.
- abstract all data collection to separate workbook
- world map clone of this
- europe clone of this
- topline datapoints text graphic
- tooltips on map
- tooltips on the DNA chart
- indiscrete scale for the colors of the chart?
