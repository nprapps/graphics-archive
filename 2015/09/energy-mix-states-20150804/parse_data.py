#!/usr/bin/env python

import json
import os

import copytext

path = os.path.dirname(os.path.realpath(__file__))
project_slug = os.path.split(path)[-1]
COPY = copytext.Copy('%s.xlsx' % project_slug)

states = {}

rows = iter(COPY['data-new'])
rows.next()

for row in rows:
    state = unicode(row['state']).strip()

    fuel = unicode(row['fuel']).strip()

    if fuel == '':
        continue

    if state == 'District of Columbia':
        continue

    if state not in states:
        states[state] = {} 
    
    if fuel in ['Petroleum Liquids', 'Petroleum Coke']:
        fuel = 'Petroleum'
    elif fuel in ['Conventional Hydroelectric', 'Hydro-electric Pumped Storage']:
        fuel = 'Hydro'
    elif fuel in ['Wind', 'Solar', 'Geothermal', 'Biomass']:
        fuel = 'Other Renewables'
    elif fuel == 'Other Gases':
        fuel = 'Other'

    # Spelling
    if fuel == 'Natural Gas':
        fuel = 'Natural gas'
    elif fuel == 'Other Renewables':
        fuel = 'Renewables'

    if fuel not in states[state]:
        states[state][fuel] = { '2004': 0, '2014': 0 }

    d2004 = unicode(row['d2004']).strip()
    d2014 = unicode(row['d2014']).strip()

    if not d2004:
        d2004 = 0.0

    if not d2014:
        d2014 = 0.0

    states[state][fuel]['2004'] += float(d2004)
    states[state][fuel]['2014'] += float(d2014)

for state in states:
    all2004 = states[state]['All Fuels']['2004']
    all2014 = states[state]['All Fuels']['2014']

    for fuel in states[state]:
        states[state][fuel]['2004'] /= all2004 
        states[state][fuel]['2014'] /= all2014

state_order = sorted(states.keys())
fuel_order = sorted(states[state_order[0]].keys())

output = []

for state in state_order:
    s = {
        'name': state,
        'fuels': {} 
    }

    for fuel in fuel_order:
        f = [{
            'year': '2004',
            'amt': unicode(states[state][fuel]['2004'])
        }, {
            'year': '2014',
            'amt': unicode(states[state][fuel]['2014'])
        }]

        s['fuels'][fuel] = f

    output.append(s)

with open('data.json', 'w') as f:
    json.dump(output, f)