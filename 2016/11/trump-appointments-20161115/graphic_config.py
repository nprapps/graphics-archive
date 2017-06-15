#!/usr/bin/env python

import base_filters

# Test google doc
# COPY_GOOGLE_DOC_KEY = '1DmpBcF4t8FOk6fpBPOgx3PDpVzulrYqWhT_yUZiDc-k'
# Actual google doc shared by politics
COPY_GOOGLE_DOC_KEY = '1AnnjUy7jbX1RzSEzltx4kiRzAV84VZ6nKIbEDkHFG3E'

USE_ASSETS = True

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS
