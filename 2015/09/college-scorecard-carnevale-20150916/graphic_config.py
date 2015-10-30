#!/usr/bin/env python

import base_filters
from math import trunc

COPY_GOOGLE_DOC_KEY = '1PPybEiEiSRdwKzF5rPMXJNnf4erdw1DT4ow8bhUjStc'

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

def format_rank(value):
    floated = trunc(float(value))
    return floated

def format_currency(value):
	return "{:,.1f}".format(float(value)/1000) + "k"

def format_score(value):
    return "{:.2f}".format(float(value))



JINJA_FILTER_FUNCTIONS = base_filters.FILTERS + [format_currency] + [format_rank] + [format_score]
