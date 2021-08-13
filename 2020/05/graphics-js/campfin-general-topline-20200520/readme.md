# some notes

### for principal campaign cmte filings (`data` tab)

* candidateName: full name
* last: last name
* totalRaised: line 7 
* cashOnHand: line 10
* spending: line 9
* smallDollar: line 17(a)(ii)
* smallDollarPct: `smallDollar` / `totalRaised`
* itemized: line 17(a)(i)
* itemizedPct: `itemized` / `totalRaised`
* individualTotal: `itemized` + `smallDollar`
* individualTotalPct: `individualTotal` / `totalRaised`
* polCmtes: line 17(b) + 17(c) + 18
* polCmtesPct: `polCmtes` / `totalRaised`
* loansOther: `totalRaised` - `individualTotal` - `polCmtes`
	* check to make sure this adds to the leftover rows on FEC filing
* loansOtherPct: `loansOther` / `totalRaised`
* dataSrc: `FEC filing`
* reportType: `Month + " " + Year`
* date: date report was filed
* endDate: end of line 5
* reportLink: url of report
* img: either Trump or Biden image url
* party: `gop` or `dem`
* footnote: 
* updatetime-GMT:
* dropout:
* period_desc: the period covered by the report (generally NOT the month it was filed in)
* amended: if TRUE, then this is excluded from totals


### for affiliated committees

the committees are:

- Republican National Committee  (monthly)
- Democratic National Committee (monthly)
- Trump Victory (quarterly)
- Trump Make America Great Again Committee (quarterly)
- Biden Action Fund (quarterly)
- Biden Victory Fund (quarterly)

data to collect:

- total raised = `Total Receipts This Period`
- cash on hand  = `Cash on Hand at CLOSE of the Reporting Period`
- spending = `Total Disbursements This Period`


### after deploying

- go into seamus and change timestamp




