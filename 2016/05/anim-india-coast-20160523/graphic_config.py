#!/usr/bin/env python

import base_filters

COPY_GOOGLE_DOC_KEY = '1Q0jsJen7jigQgOkFA1LyyZ6goil0GkeQKymHV9vFOV0'

USE_ASSETS = True

# Use these variables to override the default cache timeouts for this graphic
DEFAULT_MAX_AGE = 20
ASSETS_MAX_AGE = 20

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS
