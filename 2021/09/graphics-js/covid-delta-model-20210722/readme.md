## Relevant links or definitions

* Raw data files from here: https://github.com/midas-network/covid19-scenario-modeling-hub/tree/master/data-processed/Ensemble_LOP (next update: projections for round 8 -- Aug. 15 - Feb. 12)
* Viz example here: https://covid19scenariomodelinghub.org/viz.html (scenario D, incident deaths)
* The graphic pulls data from the `data` sheet in the google spreadsheet. `timeseries_states_us` imports U.S. timeseries data from the COVID U.S. map spreadsheet. `deaths_cleaned_mock` contains the date range for round 7 projections. `deaths_cleaned_final` contains the date range for round 8 projections.

## How to update
1. Download the new round of raw data from the link above, and move it into the `data` folder in this project.
2. Open `calc.py` and change the first `data` variable on line 5 to the name of the new data csv.
3. Run `calc.py` to process the data and output the finished product to `output.csv`.
4. The `data` sheet in the the google sheets for the project is set up with data from the previous round of projections. Delete the old data but leave the column headers. Add new data from `output.csv`.
5. Find weekly deaths data (source: TK) starting at 26 weeks before the new projection data, and also add that in.
