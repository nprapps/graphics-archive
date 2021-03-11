election-votecast-20201029
--------------------------

## General notes

AP VoteCast is a replacement for exit polls. It is a huge national survey of voters that includes early voters.

* [More about VoteCast](https://www.ap.org/en-us/topics/politics/elections/ap-votecast/faq)
* [Detailed documentation](https://docs.google.com/spreadsheets/d/1DYzzSYBNj2K-V1QgjUjHEXKC2sGfrfw0UmdIP0S2gis/edit#gid=1712956058) _(more about the survey and methodology than developer info)_

Keep this in mind when using this data:

> Because the methodology between exit polls and AP VoteCast are very different, it is not advisable to make comparisons between the two surveys.
>
> AP VoteCast is designed to more accurately reflect the composition of the electorate than traditional exit polls, and differences between exit polls and VoteCast may be a result of methodological differences rather than actual changes in how groups voted.

NPR will display subset of the poll questions/results (identified in the [`data`](https://docs.google.com/spreadsheets/d/1DYzzSYBNj2K-V1QgjUjHEXKC2sGfrfw0UmdIP0S2gis/edit#gid=1712956058) sheet of this graphic's spreadsheet).

The text displayed for a given question is set in the `question_override` column. Questions with a `question_type` value of `top` display by default. Those with a value of `detail` are collapsed in the initial view, and users can choose to expand them.

## Update schedule

AP will update the data in 5 stages:



| Stage | Time/Date | Notes |
| ----- | --------- | ----- |
| Stage 1 | Tuesday 5 p.m. ET | May not include candidate breakdowns. Make sure our display can allow for "N/A" in that case |
| Stage 2 | Tuesday 8 p.m. ET | Should start to include candidate breakdowns. |
| Stage 3 | Wednesday 12 a.m. ET | |
| Stage 4 | Wednesday 1 a.m. ET | |
| Stage 5 | Wednesday 11 a.m. ET | |

Depending on how the vote tabulation goes, there may be additional updates.

## How to pull new data

Make sure you have the [`elections20-interactive`](https://github.com/nprapps/elections20-interactive) repo set up.

In terminal, from that project, run this for live data:

```
grunt votecast --bucket="votecast-prod-app-us-east-1-customersummary-national" --arn="arn:aws:iam::198401342403:role/npr-votecast-role"
```

and this for test data:

```
grunt votecast --bucket="votecast-prod-app-us-east-1-customersummary-national-test" --arn="arn:aws:iam::198401342403:role/npr-votecast-role"
```

Any files downloaded will save into `elections20-interactive/temp/votecast/`

Copy those files to `graphics-js/election-votecast-20201029/votecast/`.

## What to do with every update

1. **Pull the latest data files.**

2. **Update the source line in the [spreadsheet](https://docs.google.com/spreadsheets/d/1DYzzSYBNj2K-V1QgjUjHEXKC2sGfrfw0UmdIP0S2gis/edit#gid=0).**

* In the `source` field in the `labels` sheet, update the number of likely voters surveyed, the time/date of the data release, margin of error and update number. You can find this information at the top of the json file. For example:

```
"state": "US",
"stage": "Stage 1",
"stage_description": "Stage 1 - Results are based on AP VoteCast interviews completed in National as of 4 p.m. ET on Election Day.",
"numberInterviews_lv": "77249",
"numberInterviews_nlv": "51451",
"elecDate": "20201103",
"jTypeCode": "SW",
"jNum": "0",
"MarginsOfError": [
 {
  "moeLikelyVoters": 2.4209604294,
  "moeNonVoters": 7.5872188197
 }
],
```

3. **Update `index.html`**

* At the very top of the page, make sure `SURVEY` points to the json file with the most recent timestamp.
* Make sure that data is showing up correctly for all the questions. You may have to restart the local server to see the updated numbers.
* With the Stage 1 update, check that the page is properly handling the data, which may not include candidate-specific breakdowns.
* Sanity-check some of the numbers shown vs. what is showing up in the national data breakdowns in [AP Newsroom](https://newsroom.ap.org/votecast/). Make sure you are looking at "2020 General Elections," not "2020 General Elections Test" (dropdown in the upper right, above the map).
