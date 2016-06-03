#!/usr/bin/env python

import base_filters

COPY_GOOGLE_DOC_KEY = '1qBD8PVaqBNYx3iyXuQmNJgGFtF7E8cysyGeiBlMMEEw'

USE_ASSETS = False

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300


def percent(value):
    return unicode(round(float(value), 3) * 100) + '%'

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS + [percent]
