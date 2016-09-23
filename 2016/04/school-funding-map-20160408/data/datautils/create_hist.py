#!/usr/bin/env python

import csv
import json
import pdb

def create_us_hist():
    data_list = []

    with open('histogram-us.csv', 'rU') as csv_f:
        reader = csv.DictReader(csv_f)
        for row in reader:
            row_data = {
                    'xmin': row['xmin'],
                    'xmax': row['xmax'],
                    'count': row['count'],
                    }

            data_list.append(row_data)

    return data_list

def create_states_hist():
    state_dict = {}

    current_state = ''
    state_list = []
    with open('histogram-states.csv', 'rU') as csv_f:
        reader = csv.DictReader(csv_f)
        for row in reader:
            if row['State.Name'] != current_state:
                if current_state != '':
                    state_dict[current_state] = state_list
                current_state = row['State.Name']
                state_list = []

            row_data = {
                    'xmin': row['xmin'],
                    'xmax': row['xmax'],
                    'count': row['count'],
                    }

            state_list.append(row_data)

    state_dict[current_state] = state_list
    return state_dict

def create_hist_json():
    us_json = create_us_hist()
    state_json = create_states_hist()

    state_json['US'] = us_json

    with open('histogram-data.json', 'w') as json_f:
        json.dump(state_json, json_f)
        print 'Wrote histogram-data.json'

if __name__ == '__main__':
    create_hist_json()

