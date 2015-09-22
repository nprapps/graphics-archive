#!/usr/bin/env python

import json
import os

import copytext

path = os.path.dirname(os.path.realpath(__file__))
project_slug = os.path.split(path)[-1]
COPY = copytext.Copy('../../dailygraphics/data/%s.xlsx' % project_slug)

states = {}

rows = iter(COPY['data'])
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
        states[state][fuel] = { '2003': 0, '2013': 0 }

    d2003 = unicode(row['d2003']).strip()
    d2013 = unicode(row['d2013']).strip()

    if not d2003:
        d2003 = 0.0

    if not d2013:
        d2013 = 0.0

    states[state][fuel]['2003'] += float(d2003)
    states[state][fuel]['2013'] += float(d2013)

for state in states:
    all2003 = states[state]['All Fuels']['2003']
    all2013 = states[state]['All Fuels']['2013']

    for fuel in states[state]:
        states[state][fuel]['2003'] /= all2003 
        states[state][fuel]['2013'] /= all2013

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
            'year': '2003',
            'amt': unicode(states[state][fuel]['2003'])
        }, {
            'year': '2013',
            'amt': unicode(states[state][fuel]['2013'])
        }]

        s['fuels'][fuel] = f

    output.append(s)

with open('data.json', 'w') as f:
    json.dump(output, f)