## Schedule for update

| Graphic | 8 a.m. ET | Note |
| ------- | ------- | ---- |
| **World map** | Yes | Requires a republish to show new numbers |
| **Table** | Yes | Requires a republish to show new numbers |
| **Seamus Page** | Yes | Whenever an update is made |


## How the data is set up
- In `_confirmed_time_raw` and `_deaths_time_raw` in the google sheets, the scraer is pulling the data directly from Johns Hopkins University's [GitHub repo](https://github.com/CSSEGISandData/COVID-19). These two feed the latest data into `latest_territory_data_jhu` and `latest_country_data_jhu` through vlookup.
- For the map, the browser processes `latest_territory_data_jhu` and `latest_country_data_jhu` through a script called `process-data.js`.
- The table gets data from 	`daily_countries_total`, which gets data through vlookup from `latest_territory_data_jhu` and `latest_country_data_jhu`.
- NOTE: both `daily_countries_total` and `country_lookup` may have countries that currently report 0 cases. I included these countries so that we don't have to add them in the future.


## Steps to update

### Update the map & table
- Check that the server has updated `_confirmed_time_raw` and `_deaths_time_raw`. If you don't see the numbers, or if they've pushed a non-scheduled update, you can [run it yourself](https://github.com/nprapps/jhu-interceptor).
- Update the `dataAsOf` field in the `labels` tab.
- Sanity-check some numbers and compare `latest_territory_data_jhu` and `latest_country_data_jhu` with last column in `_confirmed_time_raw` and the the [Johns Hopkins dashboard](https://www.arcgis.com/apps/opsdashboard/index.html#/bda7594740fd40299423467b48e9ecf6). It should be up to date, but if there's anything majorly different, or you can use the `*_override` columns in `daily_countries_totals` to override the death and confirmed column for a particular state. If you use the `*_override` columns, it will show up in both the map and table. The sum row in the `*_override` columns has a formula that lets the totals reflect overrides, if there are any.
  - Note: These data are as of midnight-ish ET, so the data we have is a little behind what JHU is showing. This is fine. You don't need to override the countries with more recent data on JHU's site.
- Sanity-check the updated map (which is running on the DG rig in your computer) with the [published map](https://apps.npr.org/dailygraphics/graphics/coronavirus-d3-world-map-20200323/preview.html#desktop). If you see some countries that exist in the published map but not in the updated map, it might be because JHU changed the display name of the country in their raw data (e.g. "Bahamas" was changed to "Bahamas, The" once). In this case, change the country's name in `name_jhu` in `daily_countries_total` to whatever the new name is.
- **NOTE:** The countries below currently have 0 cases, but we should expect to see cases soon.
    - North Korea (in JHU, they'll likely name this Korea, North)
    - Lesotho
    - Somaliland
    - Turkmenistan
    - Solomon Islands
- When updating, do a spot check to see if these countries have cases yet, and if they do, make sure the `name_jhu` in `daily_countries_total` and the name in `_confirmed_time_raw` are the same. **They will not show up on the map if they don't have the same name!**
- If everything looks good, *redeploy the map*!

### After every update
- Update the story page in Seamus
	- Update the story pubdate. (Right column, under "story settings.")
	- Every couple days, or if there has been a significant jump in numbers in a particular state, update the Seamus promo image.
		- How to create the promo image: Take a screenshot of the world map in Desktop view. For maximum flexibility when cropping in Seamus, add 1000px or so extra of white padding all around in Photoshop before saving the image out for use in Seamus.
	- Republish the page.
- Notify homepage team in the `#homepage` slack channel that the map is updated. Also tag Carmel in the message.

**Redeploy the graphic if you forgot!**

*And you're done!*


## Improvements
- Split French Guiana from France and other French & British territories
- Connecting the wires for table to not pull from `daily_countries_total` but to go off processed data from `process-data.js`
- Make map use name in JHU, and only lookup when name does not exist
