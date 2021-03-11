# Monthly Unemployment chart

This chart displays the monthly unemployment numbers back to 2007 (just before the most recent recession).

It also, optionally, can display one additional metric from the monthly jobs report:

* Payrolls-monthly - Month-to-month change in nonfarm payrolls, in thousands ([Source](https://fred.stlouisfed.org/graph/?g=kKvr))
* Payrolls-yearly - Change in nonfarm payrolls vs. 12 months ago, in thousands ([Source](https://fred.stlouisfed.org/graph/?g=kKvs))
* Wage growth - hourly average earnings, year-over-year percent change ([Source](https://fred.stlouisfed.org/graph/?g=kKn5))

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

Wage growth is in the report but the language will look something like this:

> Over the year, average hourly earnings have increased by 71 cents, or 2.7 percent.

### Update process

Coordinate with the business desk about what metric will be most relevant this month.

Each dataset has its own sheet in the Google Spreadsheet for this project (`unemployment`, `payrolls_year`, `payrolls_month`, `wages`).

#### The `labels` sheet

The first line in the `labels` sheet -- `mode_secondary` -- serves as a toggle for which chart will display under the unemployment chart. If no secondary chart is necessary, you can select `none`.

The `footnote` and `hed_secondary` fields pull from relevant fields further down the sheet, based on what the `mode_secondary` is set to. Don't edit them unless you have to. (They're protected. You can edit them, but Google Sheets will flash an error to make sure you know what you're doing.)

There is code in `_content.html` and `graphic.js` that also keys off the `mode_secondary` setting. (Controlling what secondary data is loaded in and some display configuration (y-axis settings, labelling) appropriate to the dataset.)
