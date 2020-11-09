# Weekly Unemployment Claims

The Department of Labor reports initial unemployment claims every week. The most recent couple weeks in the data are preliminary, so expect that they will change in later updates.

* The most recent report (same URL updates each week): https://www.dol.gov/ui/data.pdf
* Historical data: https://oui.doleta.gov/unemploy/claims.asp

Past weeks have included a hexmap showing % change by state. This iteration of the graphic does not include that.

### Line Chart

One chart shows the general trend of weekly initial unemployment claims. This is the first one to update — right at 8:30 a.m. when the report doc updates.

Key files:
* `index.html`
* `_line-chart.html`
* `line-chart.js`
* `line-chart.less`

Sheets in the spreadsheet:
* `labels`
* `data`

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
