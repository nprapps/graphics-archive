# To update

1. Duplicate this graphic
2. Duplicate the d3-us-map Google sheet that gets auto-updated
3. In the manifest of the new graphic, point the sheet to the new google sheet
4. In the new google sheet, create a tab called `hosps_data`
5. Copy/paste the data from [this table](https://covidtracking.com/data/national/hospitalization) into the `hosps_data` tab
6. Format the `Date` column in the sheet as MM/DD/YYYY
7. In the `labels` sheet, add a field called `hospAsOf`, which should be the same M/D date as the `dataAsOf` field (ex. Dec. 4)
8. Also in the `labels` sheet, add a field called `sourcehosps`, and paste this into it: `<a href='https://covidtracking.com/data/national/hospitalization'>The COVID Tracking Project</a>`
9. Finally, in `labels` sheet, delete the text from the `subhed` field

Voila!
