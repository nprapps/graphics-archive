# Updating the industry graphics

BLS data: Table B-1

First, make a copy of this directory.

### DATA TRANSORMATION

1. From Table B-1, use your cursor to highlight "Goods-producing" in the table. Then shift-click at the end of the last number in the last row of the table (this is the monthly change for "Local government, excluding education"). You should now have all the data selected, except the header row and the first two rows of data, which we are not showing in the graphic.
2. Create a new tab in the google sheet and preface its name with an underscore (i.e. `_tempData`).
3. In the new tab, paste the data.
4. Cmd+A to select all, then use the "format" dropdown to select "clear formatting."
5. Either through a filter or manually, delete the rows that are blank
6. Delete columns B-F. 
7. Delete the last column, which should be column E
8. To help you keep track of the data, add a header row and label the remaining columns. For the June 5 update, they should be ["name", "Mar", "Apr", "May"] 
9. Copy to the clipboard the three columns that are NOT "name"
9. On the `_rawCLEANNAMES` tab, insert a column before the `Jan_Jan_pctchange` column (for June update, that should be column L)
10. Click on the cell in the first row two columns to the left of column you just created (for June update, that would be `J1` 
10. Paste the data you have on your clipboard, overwriting the past two months and inserting data for a new month
11. On the `_rawCLEANNAMES` tab, insert a new column to the left of the last column. Use the formula in the column to the left of the new column to create a new formula that calculates the pct change bw January and the latest month, and copy it down for every row in the sheet
10. Copy all the data in the cells that show a pct change (for June update, this is M2:Q174)

### THIS IS WHERE IT GETS STUPID (sorry.)

1. Open a new Excel file
2. Paste the data into an EXCEL file
3. Copy the data FROM the Excel file
4. Create a new tab in the Excel file
5. Paste special => transpose
6. Copy the transposed data

### OK BACK TO GOOGLE SHEETS

1. Paste into cell B2 of the `data` sheet
2. Add a month label for the most recent row

### ALMOST DONE!

1. Back in the `_rawCLEANNAMES`, change the formula in the last column to now compare January and and the latest month (it says april, in the colheader, but the name won't show up in the graphic)
2. Paste that into `janaprraw` sheet in the value column
3. Spot check against the original data, especially to make sure BLS didn't change the order that it lists its sector types
4. Update the `labels` sheet




