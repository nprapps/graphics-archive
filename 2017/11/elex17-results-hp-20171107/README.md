Gubenatorial Election 2017 Results
==================================

* [What is this?](#what-is-this)
* [What's in here?](#whats-in-here)
* [Custom Configuration](#custom-configuration)
* [Results Data Format](#results-data-format)

What is this?
-------------

Results table for the November 7, 2017 gubenatorial election for both Virginia and New Jersey. We didn't end up using this on election night because the New Jersey election authority didn't publish racewide results on election night.

This is a live-updating results table that pulls results from a JSON file created with the [Google Spreadsheet Result Loader](https://github.com/nprapps/google-spreadsheet-election-loader) on election night.

After the election, it can bake the results directly into the HTML to be more archival.

What's in here?
---------------

For clarity, this only lists files that are different from a typical dailygraphics graphic.

* ``custom_filters.py`` -- Custom Jinja filters to transform the results data.  On election night, this is handled by the loader.  So, this code is just copied from [google-spreadsheet-election-loader/loader.py](https://github.com/nprapps/google-spreadsheet-election-loader/blob/master/loader.py), with a little extra boilerplate to make them work as Jinja filters.  These are wired up in `graphic_config.py`

Custom configuration
--------------------

### Spreadsheet variables

#### `is_test_data`

If set to `yes`, show a warning message that the results data are test values.  This is a useful reminder to member stations who might be embedding the graphic and not as in tune with our production timelines.

#### `test_message`

Message displayed above the table if `is_test_data` is set.

#### `inline_results`

If not empty, pull results from an inline JavaScript variable instead of requesting a remote JSON file.  This is ideal for after the election is over, to make the graphic more archival.

### JavaScript variables

#### `DATA_URL`

HTTP URL for the results JSON file on S3 or `false` to disable remote fetching of results.

#### `RESULTS`

JSON object representing election results.

#### `RESULTS_PROPERTY`

An array of properties in the results object for which to display results tables.

*Example*

```
var RESULTS_PROPERTY = [ 'va_data', 'nj_data' ];
```

## Results Data Format

```
{
    nj_data: [
        {
            updated_date: "Nov. 7",
            precincts_total: 0,
            name: "Kim Guadagno",
            precincts_reporting: 0,
            winner: "no",
            vote_pct: 0,
            updated_time: "8:23 p.m.",
            precincts_pct: 0,
            vote_count: 0,
            aggregate_as_other: "no",
            party: "R"
        },
        {
            updated_date: "Nov. 7",
            precincts_total: 0,
            name: "Philip Murphy",
            precincts_reporting: 0,
            winner: "yes",
            vote_pct: 0,
            updated_time: "8:23 p.m.",
            precincts_pct: 0,
            vote_count: 0,
            aggregate_as_other: "no",
            party: "D"
        },
        {
            precincts_pct: 0,
            precincts_reporting: 0,
            vote_count: 0,
            updated_date: "Nov. 7",
            name: "Other",
            precincts_total: 0,
            party: "",
            winner: "",
            vote_pct: 0,
            updated_time: "8:23 p.m."
        }
    ],
    va_data: [
        {
            updated_date: "Nov. 8",
            precincts_total: 2566,
            name: "Ed Gillespie",
            precincts_reporting: 2566,
            winner: "no",
            vote_pct: 44.955036643553974,
            updated_time: "10:24 a.m.",
            precincts_pct: 100,
            vote_count: 1172533,
            aggregate_as_other: "no",
            party: "R"
        },
        {
            updated_date: "Nov. 8",
            precincts_total: 2566,
            name: "Ralph Northam",
            precincts_reporting: 2566,
            winner: "yes",
            vote_pct: 53.86811387777558,
            updated_time: "10:24 a.m.",
            precincts_pct: 100,
            vote_count: 1405007,
            aggregate_as_other: "no",
            party: "D"
        },
        {
            precincts_pct: 0,
            precincts_reporting: 2566,
            vote_count: 30695,
            updated_date: "Nov. 8",
            name: "Other",
            precincts_total: 2566,
            party: "",
            winner: "",
            vote_pct: 1.176849478670442,
            updated_time: "10:24 a.m."
        }
    ]
}
```
