# Weekly Unemployment Claims

The Department of Labor reports initial unemployment claims every week. The most recent couple weeks in the data are preliminary, so expect that they will change in later updates.

* The most recent report (same URL updates each week): https://www.dol.gov/ui/data.pdf
* Historical data: https://oui.doleta.gov/unemploy/claims.asp

Past weeks have included a hexmap showing % change by state. This iteration of the graphic does not include that.

### Line Chart

One chart shows the general trend of weekly initial unemployment claims. This is the first one to update — right at 8:30 a.m. when the report doc updates.

Key files:
* `trend.html`
* `_line-chart.html`
* `line-chart.js`
* `line-chart.less`

Sheets in the spreadsheet:
* `labels_trend`
* `data_trend`

To update:
* Get the new number from the table at the top of page 4 of the report (second column, "initial claims (SA)").
* Update last week's number from the third column
* Make sure the labels are readable on desktop/mobile. You may need to adjust label positioning using the `x_offset` and `y_offset` optional params in the `data_trend` sheet.
* In the `labels_trend` sheet, update the date in the source line
* Publish, send to Avie.

Promo images:
* If homepage or the business desk wants a version of the chart to use as a **Seamus promo image**, take a screenshot of the chart itself (nothing else around it), and then add a few hundred pixels of white space all around to give yourself some flexibility to crop this at different aspect ratios. ([Example](https://media.npr.org/assets/img/2020/04/09/seamus-unemployment-weekly-20200409_archive.png)) It's ok to make modifications to the graphic's CSS/JS to make sure the screenshot will fit well in a 16:9 crop. (Just don't commit/publish these.) Add it to the page in Seamus as a promo image.
* **Instagram:** Take a screenshot of the graphic in mobile view (consider a few adjustments: making the annotation text a hair larger, the headline a few points smaller, deleting the subhed). Include the headline and chart (omit the source/credit — that'll be handled in the caption). Send to Emily.
* **Social:** Take a screenshot of the chart and use the twitterbug Photoshop action. Share the image in the #social-assets Slack channel, including the story URL and tagging `@avie`.

### Table

This table has changed shape a lot from week to week. It's possible it won't be needed at all next week. Or it could morph into something else — maybe just adding a fourth column so it reflects the total jobs lost over four weeks.

Key files:
* `_data-table.html`
* `data-table.js`
* `data-table.less`
* `index.html`

Sheets in the spreadsheet:
* `labels`
* `data`

I use [Tabula](https://tabula.technology/) to pull the first four columns of the table on page 5 of the PDF (Advance State Claims - Not Seasonally Adjusted. columns needed: state + everything under "Initial Claims Filed During Week Ended [date]"). Tabula doesn't do this cleanly: It'll lump all the data columns together into a single column and swap around the order. You'll need to split the columns with a `" "` delimiter and then swap the column order back.

Make a new column for this sheet in the `data` sheet and carefully copy the "advance" column over, making sure the states match up. (Sometimes the state sort order is not the same.)

Then check the "prior wk" column in the new report vs. the previous week's column in the `data` sheet. There likely will be slight differences. Update the Google Sheet with the data from the new report.

Update the `total` column to add in the new column.

Double-check the "footnote" column to only star the states that are starred in this table of the report.

Spot check several states' numbers against the most recent report.

In the `labels` sheet, update the date in the source line and the states with preliminary data in the footnote. Add a row for a new `hdr_[week]` table column header label for this week.

In `_data-table.html`, add columns to the header row and the data loop to pull in to the new week's data. You may need make adjustments to make this all fit on mobile. You will also need to modify the code that assigns a "most" class to the column that has the largest value — it's not written to account for this fourth week of data.
