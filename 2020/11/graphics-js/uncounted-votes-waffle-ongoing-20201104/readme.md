## About this graphic

- This graphic pulls from the `margins_2016` and `current_uncounted` sheets in the spreadsheet.
- The `current_uncounted` sheet contains current uncounted votes and vote margins data. This is the sheet to update.
- The `margins_2016` sheet contains winning vote counts for the 2016 election, used in the third/last subgraphic.
- The `working` sheet contains source data and calculations for the 2016 vote margins.
- The child graphics with `liveblog` in the slug are copies of the original, broken up and styled for use in a liveblog post. The original graphic at `index` will live in the story("https://www.npr.org/2020/11/04/931267485/where-vote-totals-stand-in-the-states-that-have-yet-to-be-called") whenever it gets edited.

## How to update
- Run separate python script to get a CSV with data that should match the format of `current_uncounted`
- Import that CSV into `current_uncounted`, replacing old data
- Check to make sure that none of the included states have been called, or have had all their votes counted. If they have, take them out of the data, and adjust the count in the first headline.
- Update timestamp in `labels` sheet, at `time_updated`
