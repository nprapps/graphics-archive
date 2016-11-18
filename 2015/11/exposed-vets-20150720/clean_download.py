#!/usr/bin/env python

import csv

def clean_date(d):
    if not d:
        return ''

    bits = str(d).split('/')

    if len(bits) == 1:
        month = '?'
        day = '?'
        year = bits[0]
    elif len(bits) == 2:
        month = bits[0]
        day = '?'
        year = bits[1]
    else:
        month, day, year = bits

    output = ''

    if '?' not in month:
        output = month.zfill(2) + '/'

    if '?' not in year:
        output += year

    return output

with open('data.csv') as f:
    rows = list(csv.reader(f))
    headers = rows.pop(0)

headers[0] = 'npr_id'
del headers[7]

output = [headers]

for row in rows:
    for i in [4, 8, 10]:
        row[i] = clean_date(row[i])

    del row[7]

    output.append(row)

with open('download/data.csv', 'w') as f:
    writer = csv.writer(f)
    writer.writerows(output)
