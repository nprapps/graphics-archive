covid-hotspot-20210728
======================

This interactive county map, which [lives on this Seamus page (`1021795290`)](https://www.npr.org/1021795290), shows how the CDC rates U.S. counties for COVID-19 community transmission.

## Getting started

The first time you use this project, run `node cli sync covid-hotspot-20210728` in the dailygraphics-next directory to pull the latest files in the `synced` folder.

## How to update this graphic

The date range and data should auto-update each day from the [CDC](https://covid.cdc.gov/covid-data-tracker/#county-view). This happens in the jhu-interceptor repo, in vaccines.js.

1. Double check that the date range and map data matches what is displayed on the [CDC](https://covid.cdc.gov/covid-data-tracker/#county-view) website. The date range should be 2 days behind the current date (ex: if it's Oct. 13, the date range will say Oct 5-Oct 11). Double check that you can still click on counties (and hover on desktop).

2. Republish in the graphics rig and in Seamus. Change the promo image if the map has changed significantly.

We keep timeseries data in the counties_timeseries tab. This is currently not in use, but could be used to visualize changes over time. Also in case the sheet gets too large, this data isn't used anywhere and can be deleted.
