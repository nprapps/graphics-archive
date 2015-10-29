#!/usr/bin/env python

import base_filters

COPY_GOOGLE_DOC_KEY = '1TizdTDRLhb2rnhUX9LY2uIQ99-Fdk9c_Gs9SKvvakYU'

USE_ASSETS = False

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS

PARISHES = [
    'st-bernard'
]
