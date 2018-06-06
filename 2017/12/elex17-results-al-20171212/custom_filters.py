"""
Custom filters for shaping election results for use by front-end code.

To be used once we do not need live results anymore.

"""
import os
import json

def bake_results(val):
    cwd = os.path.dirname(__file__)
    INPUT_PATH = os.path.join(cwd, val['value'])
    with open(INPUT_PATH, 'rb') as readfile:
        results = readfile.read()

    return results

FILTERS = [
    bake_results
]
