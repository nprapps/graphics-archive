## How to update this graphic

1. Run locally and scroll through the `longform.html` view to make sure everything looks okay
	* If anything looks funky (extra-long links, missing chunks of text, weird formatting), debug in [the spreadsheet](https://docs.google.com/spreadsheets/d/1fR7-3TEYbeV8FNdPuwAlZ3dSXBQgbXyqWLB_cDvu0ec/edit#gid=0)
	* Common issues: missing or incorrect anchor tags, mismatched straight vs. curly quotes in the `href`
	* There's usually at least one issue with the anchor tags, so make sure to scroll through the entire thing before re-publishing!
2. Make sure the `last_updated` field in the `labels` tab is updated with today's date
3. Re-publish the graphic
4. Check [published story](https://www.npr.org/sections/health-shots/2021/02/18/967448680/how-to-sign-up-for-a-covid-19-vaccine-in-your-state) for weird formatting
	* Phone numbers are detected and auto-formatted via regex, but sometimes they look weird once published
	* Re-publishing again usually fixes the issue
5. Update publication date in Seamus (`967448680`)
