# Monthly Unemployment charts

These chart display information released monthly in the BLS' jobs report. As of June 2021, we've displayed three charts separately:

* **Historic Unemployment** - Percent unemployment, for all population 16 years and over. Found in `historic_unemployment` sheet. (Latest data found in the [report](https://www.bls.gov/news.release/empsit.nr0.htm), or the last three months can be found [here](https://www.bls.gov/news.release/empsit.a.htm). Or go to [FRED](https://fred.stlouisfed.org/graph/?g=ENgB) for historic data).
* **Payrolls-monthly** - Month-to-month change in nonfarm payrolls, in thousands, since 2007 (Found in the `payrolls_historic` sheet. ([Source](https://data.bls.gov/timeseries/CES0000000001))
* **Cumulative payrolls**, in thousands, since March 2020 (in `payrolls_cumulative` sheet, calculated from `payrolls_historic`.)

### Data notes

New jobs numbers are released at 8:30 a.m. on the first Friday of the month. The [BLS website](https://www.bls.gov/news.release/empsit.nr0.htm) updates first.

The two most recent data points in any report are typically preliminary and subject to revision in a future report. When doing an update, double-check the last four data points.

BLS has a page with [recent month-over-month payroll numbers](https://www.bls.gov/web/empsit/ceseesummary.htm). For more historical numbers, look up [series CES0000000001](https://data.bls.gov/timeseries/CES0000000001) on BLS's website. To get month-over-month difference, follow these steps on that page. 

1. Click "More Formatting Options""
1. Select years 2007 to 2019
1. Select 1-Month Net Change
1. Select text outcome
1. Click "Retrieve Data"
1. Format data to fit our spreadsheet. 

FRED (links above) is also great for historical data, but doesn't update until a little later in the morning.

Once a year, for the January jobs report (published Friday of *February*, there will be rebenchmarks, and the past year will be revised altogether. Keep an eye out for this.

### Update process

1. Clone the repo
1. Add month on the end of each sheet
1. Add new data to `historic_unemployment` and `payrolls_historic` and drag the formula in column B down in `payrolls_cumulative`.
1. Update preliminary data (last 2-4 months) in `historic_unemployment` and `payrolls_historic`. `payrolls_cumulative` will auto update.
	- If its February, see note on rebenchmarking above. 
1. Update heds
1. Adjust labels to not overlap/look bad
1. Update recession dates in each of the .js files for the historic charts (towards the top). Data [here](https://www.nber.org/research/data/us-business-cycle-expansions-and-contractions). 
1. Publish graphics 
1. Check with editor on heds/subheds
1. add to seamus (if editor doesn't)
1. create twitter bugs

Coordinate with the business desk about what metric will be most relevant this month.

Each dataset has its own sheet in the Google Spreadsheet for this project (`historic_unemployment`, `payrolls_historic`, `payrolls_cumulative`).

### Creating promo image and twitter bugs

To create the promo image do the following:

1. In `cumulative_payroll.html` add the promo class to the `annotated-line-chart` div.
1. In `cumulative_payroll.js` change `isPromo` to `true`. 
1. Refresh and get a screencap.
1. Use photoshop to create social image and promo image. 

