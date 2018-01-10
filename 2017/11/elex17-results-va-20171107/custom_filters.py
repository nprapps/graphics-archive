"""
Custom filters for shaping election results for use by front-end code.

All of this comes from the google-spreadsheet-election-loader
project:
https://github.com/nprapps/google-spreadsheet-election-loader/blob/master/loader.py

"""
# In Python 3.0, 5 / 2 will return 2.5 and 5 // 2 will return 2.
# We want this to work in Python 2 as well.
from __future__ import division

import functools
import json

def compose(*functions):
    """
    Compose multiple functions into a single function
    Create a function that calls a series of functions, passing the output of
    one function as the input of the next.
    See https://mathieularose.com/function-composition-in-python/
    """
    return functools.reduce(lambda f, g: lambda x: f(g(x)), functions, lambda x: x)

convert_to_int = compose(int, float)

def convert_to_dict(sheet):
    """Convert the copytext Sheet object into a JSON serializeable value"""
    dict_keys = [
        'name',
        'party',
        'winner',
        'vote_count',
        'precincts_reporting',
        'precincts_total',
        'updated_date',
        'updated_time',
        'aggregate_as_other',
    ]
    converters = {
        'vote_count': convert_to_int,
        'precincts_reporting': convert_to_int,
        'precincts_total': convert_to_int,
    }
    output = []

    for row in sheet:
        output_row = {}
        for k in dict_keys:
            val = row[k]

            try:
                val = converters[k](val)
            except KeyError:
                # There's no converter for this particular key
                pass

            output_row[k] = val

        output.append(output_row)

    return output

def calculate_vote_pct(results):
    total_votes = 0
    output_results = []

    for row in results:
        total_votes += row['vote_count']

    for row in results:
        updated_row = dict(**row)

        if total_votes == 0:
            updated_row['vote_pct'] = 0
        else:
            updated_row['vote_pct'] = (row['vote_count'] / total_votes) * 100

        output_results.append(updated_row)
   
    return output_results

def calculate_pct_precincts_reporting(precincts_reporting, precincts_total):
    if precincts_total == 0:
        return 0

    precincts_pct_raw = (precincts_reporting / precincts_total) * 100
    precincts_pct = round(precincts_pct_raw, 0)

    if precincts_pct_raw > 0 and precincts_pct == 0:
        precincts_pct = '<1'
    elif precincts_pct_raw < 100 and precincts_pct == 100:
        precincts_pct = '>99'
    else:
        precincts_pct = round(precincts_pct_raw, 1)

    return precincts_pct

def calculate_precinct_pct(results):
    output_results = []

    precincts_total = results[0]['precincts_total']
    precincts_reporting = results[0]['precincts_reporting']

    precincts_pct = calculate_pct_precincts_reporting(precincts_reporting, precincts_total)

    # Return
    for row in results:
        updated_row = dict(**row)
        updated_row['precincts_pct'] = precincts_pct
        output_results.append(updated_row)

    return output_results

def aggregate_other(results):
    """
    Aggregate third-party candidate votes into an "Other" candidate.
    Some third-party candidates receive so few votes that editors requested
    that their votes be rolled up into an "Other" pseudo-candidate.
    """
    output_rows = []

    # Declare other row as dict
    other_row = {
        'name': 'Other',
        'party': '',
        'winner': '',
        'vote_count': 0,
        'vote_pct': 0,
        'precincts_reporting': 0,
        'precincts_total': 0,
        'precincts_pct': 0,
        'updated_date': '',
        'updated_time': '',
    }
    # Track whether we actually have third party candidates that we're
    # rolling up into an "Other" candidate.
    aggregated_other = False

    for row in results:
        if row['aggregate_as_other'] != 'yes':
            # If this is just a normal candidate, just pass this row straight
            # to the output and move on to the next row.
            output_rows.append(row)
            continue

        # Candidate is a third-party candidate that we want to aggregate into an
        # "Other" pseudo-candidate
        aggregated_other = True
        other_row['vote_count'] += row['vote_count']
        other_row['vote_pct'] += row.get('vote_pct', 0)

        # If we haven't set the common fields, set them
        if other_row['precincts_reporting'] != '':
            other_row['precincts_reporting'] = int(row['precincts_reporting'])
            other_row['precincts_total'] = int(row['precincts_total'])
            other_row['updated_date'] = str(row['updated_date'])

            # TODO: Check if updated time is same or after, then update
            other_row['updated_time'] = str(row['updated_time'])

    # If we encountered any third-party candidates that were aggregated into
    # an "Other" pseudo-candidate, append the pseudo-candidate row to the output
    # data.
    if aggregated_other:
        output_rows.append(other_row)

    return output_rows

# Create a single transformation function that runs a series of other
# transformation functions.  Note that the functions are called in reverse
# order.

_transform_results = compose(
    aggregate_other,
    calculate_vote_pct,
    calculate_precinct_pct,
    convert_to_dict,
)

# HACK: Lambda functions don't work as a filter, apparently
def transform_results(val):
    return _transform_results(val)

def jsonify(val):
    return json.dumps(val)

FILTERS = [
    transform_results,
    jsonify,
]
