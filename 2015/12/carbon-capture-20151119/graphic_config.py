#!/usr/bin/env python

import base_filters

COPY_GOOGLE_DOC_KEY = '1Z6sCS1lVG-ThrwidS3yGYGAgPaQJTWk-ba2l8vqlDKI'

USE_ASSETS = True

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
ASSETS_MAX_AGE = 100

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS
