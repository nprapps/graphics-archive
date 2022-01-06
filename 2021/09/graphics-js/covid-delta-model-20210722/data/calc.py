import pandas as pd
import numpy as np
import csv

data = pd.read_csv("2021-07-03-Ensemble_LOP.csv", low_memory=False) # -----> change this to the new file name for data
data = data[(data["scenario_id"] == "D-2021-07-13")] #filter for scenario d
data = data[(data["location"] == "US")] #filter for all US numbers
data = data[(data["target"].str.contains("inc death"))] #filter for weekly deaths

#filter for 2.5th, 50th, 97.5th quantiles
quant1 = data["quantile"] == 0.025
quant2 = data["quantile"] == 0.500
quant3 = data["quantile"] == 0.975
data = data[quant1 | quant2 | quant3]

#drop unnecessary columns
data.drop(data.columns.difference(["quantile", "target_end_date", "value"]), 1, inplace=True)

#make pivot table based on dates
table = pd.pivot_table(data, index=["target_end_date"], values=["value"], columns="quantile")

#flatten + rename columns and shuffle things around
table.columns = [ '_'.join([str(c) for c in c_list]) for c_list in table.columns.values ]
table.columns = ["lower", "Estimated weekly deaths", "upper"]
table.index.names = ["date"]
column_order = ["Estimated weekly deaths", "lower", "upper"]
table = table.reindex(column_order, axis = 1)

# print table
table.to_csv("output.csv")
