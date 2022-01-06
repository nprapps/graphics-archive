import pandas as pd

filename = 'DailyCIR.csv'

df = pd.read_csv(filename)
pop = pd.read_csv('fyi.StatePopulation.csv')

df = pd.merge(df, pop, on='State', how='left')

df['50prctile'] = df['50prctile'] * df['Population']
df['2.5prctile'] = df['2.5prctile'] * df['Population']
df['97.5prctile'] = df['97.5prctile'] * df['Population']

df = df.groupby('Date', as_index=False, sort=False).agg({'50prctile':'sum', '2.5prctile' :'sum',  '97.5prctile': 'sum'})

df.to_csv('data-joined.csv', index = False)