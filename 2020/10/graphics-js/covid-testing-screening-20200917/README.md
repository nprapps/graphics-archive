# covid-testing-screening-20200917

This graphic accompanies a story about COVID-19 surveillance testing recommendations (in addition to previous diagnostic recommendations).

The data we have likely will need to be refreshed before this runs. Harvard/Brown would send new spreadsheets.

### Roadmap introductory graphic

Something Carmel suggested in [this brainstorming doc](https://docs.google.com/document/d/1-hsUiboS0ZHZ3PniEdSOYJ4uA8pR2yQrq78trnX34uQ/edit?ts=5f64e868). We have so much else, I'm not totally sure it's still necessary. But I'll leave that to y'all to talk through.

### Current COVID risk level by state

**Goal:** Show the status of the outbreak by state. Help people find themselves.

**TODO:**

* This doesn't exist yet. Would be a smaller version of [this map](https://apps.npr.org/dailygraphics/graphics/coronavirus-d3-us-map-20200312/change-map.html) on the COVID graphics page. (Minus the table?)

### Detailed testing recommendations by sector ([index.html](https://apps.npr.org/dailygraphics/graphics/covid-testing-screening-20200917/preview.html#desktop))

**Goal:** Show how the frequency of recommended testing varies by sector, priority, COVID risk level. Help people get a sense of what is recommended in their area.

**Notes:**

* The text for the toggle buttons lives in the `sector_menu` sheet.

**TODO:**
* There is proof-of-concept markup/css for the K-12 section, but the text/data that's there needs to be ported back to the spreadsheet. And content for the other sectors needs to be set up.
* Button toggles are styled but not functional.

### Numbers of tests needed ([targets.html](https://apps.npr.org/dailygraphics/graphics/covid-testing-screening-20200917/preview.html?preview=targets.html#desktop))

**Goal:** Give a sense of testing capacity, need, sense of priority. Aimed more at policymakers.

**Notes:**

* This is furthest along (filled out / functional). Carmel hasn't seen it yet, though she did sketch a version of it.
* The data for the U.S. view lives in the `data_targets` sheet. Numbers pulled from Harvard/Brown's "surveillance testing scenarios" Excel file.
* The data for the states live in the `data_states` sheet. Numbers pulled from Harvard/Brown's "surveillance and diagnostic testing calculator" Excel file (use the dropdown to get individual states) for screening numbers and "HGHI COVID Test Estimates" ("TOTAL TESTS (Contact Tracing and Isolation)" column) for diagnostic/symptomatic numbers.
