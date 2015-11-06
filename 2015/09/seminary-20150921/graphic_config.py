#!/usr/bin/env python

import base_filters

COPY_GOOGLE_DOC_KEY = '1HySLHXxoFuNY8c-XkZbrYGI8n09PxgJVzb0TivTNdps'

USE_ASSETS = False

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS

AGES = [
    'Younger than 25',
    '25 to 29',
    '30 to 34',
    '35 to 39',
    '40 to 49',
    '50 and older'
]
