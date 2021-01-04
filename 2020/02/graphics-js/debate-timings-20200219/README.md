debate-timings
--------------

This graphic displays cumulative times for how long a candidate spoke during the 2020 Democratic primary debate in November 2019.

Documentation: [How to update the spreadsheet](https://docs.google.com/document/d/1PmD56u3CP_DibFip9PNctRufsTv0I4yfr5RwTtDA3uw/edit)

### Tracking time

In the graphic's data spreadsheet, there is a Google Add-On ("track time") that pulls candidate names from the `candidates` sheet to populate a list of buttons. Timekeepers click those buttons to record speaking start and end times, which are recorded in rows on the `_who` sheet.

### Tallying time

The `totals` sheet in the spreadsheet is a pivot table that aggregates the various candidates / times logged in the `_who` sheet. The graphic, then pulls from this sheet. (Called in `_content.html`.)

### Graphic

The graphic is designed to display at 400px wide -- a decent compromise width that can work for both the liveblog and social, and on desktop vs. mobile. The graphic is never actually published live / embedded. Take a screenshot and save out a PNG.

**For the liveblog:** Trim all padding and extraneous stuff. (Like a fallback image.)

**For social:** Add padding and an NPR logo (using the twitterbug Photoshop action). You may need to tweak the width of the credit line when you take the screenshot so the NPR logo doesn't overlap the credit.
