#!/usr/bin/env python

import base_filters

COPY_GOOGLE_DOC_KEY = '171b9pt64T4zRh0SnrZf4pqUeij3enQMnNqjl2-6TOkk'

USE_ASSETS = False

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300

def breaks(n):
    n = float(n)

    if (n >= 200):
        return 'plus200'
    elif (n >= 150):
        return 'plus150'
    elif (n >= 100):
        return 'plus100'
    elif (n >= 50):
        return 'plus50'
    else:
        return 'plus0'

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS + [breaks]
