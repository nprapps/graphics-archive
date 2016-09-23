#!/usr/bin/env python

import csv
import json
import pdb

"""
    Create a json keying district GEOID to the name of the district,
    for use in the district lookup.
"""
def create_bbox_json():
    bbox_json = {}

    with open('us-states.json', 'rU') as json_f:
        states_dict = json.load(json_f)
        for state in states_dict['features']:
            state_bbox = get_bbox(state)
            state_code = get_state_abbrev(state['id'])
            state_data = {
                    'name': state['properties']['name'],
                    'code': state_code,
                    'bbox': state_bbox
                    }

            bbox_json[state['id']] = state_data

    with open('states-bbox.json', 'w') as bbox_f:
        json.dump(bbox_json, bbox_f)
        print 'Wrote states-bbox.json'


def get_bbox(data):
    all_coords = data['geometry']['coordinates'];

    x_mins = []
    x_maxs = []
    y_mins = []
    y_maxs = []

    if data['geometry']['type'] == 'Polygon':
        for coords in all_coords:
            x_mins.append(min(coords, key=lambda x: x[0])[0])
            x_maxs.append(max(coords, key=lambda x: x[0])[0])
            y_mins.append(min(coords, key=lambda x: x[1])[1])
            y_maxs.append(max(coords, key=lambda x: x[1])[1])
    else:
        for coords in all_coords:
            point_coords = coords[0]
            x_mins.append(min(point_coords, key=lambda x: x[0])[0])
            x_maxs.append(max(point_coords, key=lambda x: x[0])[0])
            y_mins.append(min(point_coords, key=lambda x: x[1])[1])
            y_maxs.append(max(point_coords, key=lambda x: x[1])[1])


    x_min = min(x_mins)
    x_max = max(x_maxs)
    y_min = min(y_mins)
    y_max = max(y_maxs)

    return [[x_min, y_min],[x_max,y_max]]


def get_full_state(fips):
    state_lookup = {
           '01': 'Alabama',
           '02': 'Alaska',
           '04': 'Arizona',
           '05': 'Arkansas',
           '06': 'California',
           '08': 'Colorado',
           '09': 'Connecticut',
           '10': 'Delaware',
           '11': 'District of Columbia',
           '12': 'Florida',
           '13': 'Georgia',
           '15': 'Hawaii',
           '16': 'Idaho',
           '17': 'Illinois',
           '18': 'Indiana',
           '19': 'Iowa',
           '20': 'Kansas',
           '21': 'Kentucky',
           '22': 'Louisiana',
           '23': 'Maine',
           '24': 'Maryland',
           '25': 'Massachusetts',
           '26': 'Michigan',
           '27': 'Minnesota',
           '28': 'Mississippi',
           '29': 'Missouri',
           '30': 'Montana',
           '31': 'Nebraska',
           '32': 'Nevada',
           '33': 'New Hampshire',
           '34': 'New Jersey',
           '35': 'New Mexico',
           '36': 'New York',
           '37': 'North Carolina',
           '38': 'North Dakota',
           '39': 'Ohio',
           '40': 'Oklahoma',
           '41': 'Oregon',
           '42': 'Pennsylvania',
           '44': 'Rhode Island',
           '45': 'South Carolina',
           '46': 'South Dakota',
           '47': 'Tennessee',
           '48': 'Texas',
           '49': 'Utah',
           '50': 'Vermont',
           '51': 'Virginia',
           '53': 'Washington',
           '54': 'West Virginia',
           '55': 'Wisconsin',
           '56': 'Wyoming'
        }

    if len(fips) < 2:
        fips = '0' + fips

    return state_lookup[fips]

def get_state_abbrev(fips):
    state_lookup = {
        '02': 'AK',
        '01': 'AL',
        '05': 'AR',
        '60': 'AS',
        '04': 'AZ',
        '06': 'CA',
        '08': 'CO',
        '09': 'CT',
        '11': 'DC',
        '10': 'DE',
        '12': 'FL',
        '13': 'GA',
        '66': 'GU',
        '15': 'HI',
        '19': 'IA',
        '16': 'ID',
        '17': 'IL',
        '18': 'IN',
        '20': 'KS',
        '21': 'KY',
        '22': 'LA',
        '25': 'MA',
        '24': 'MD',
        '23': 'ME',
        '26': 'MI',
        '27': 'MN',
        '29': 'MO',
        '28': 'MS',
        '30': 'MT',
        '37': 'NC',
        '38': 'ND',
        '31': 'NE',
        '33': 'NH',
        '34': 'NJ',
        '35': 'NM',
        '32': 'NV',
        '36': 'NY',
        '39': 'OH',
        '40': 'OK',
        '41': 'OR',
        '42': 'PA',
        '72': 'PR',
        '44': 'RI',
        '45': 'SC',
        '46': 'SD',
        '47': 'TN',
        '48': 'TX',
        '49': 'UT',
        '51': 'VA',
        '78': 'VI',
        '50': 'VT',
        '53': 'WA',
        '55': 'WI',
        '54': 'WV',
        '56': 'WY'
    }

    if len(fips) < 2:
        fips = '0' + fips

    return state_lookup[fips]

if __name__ == '__main__':
    create_bbox_json()
