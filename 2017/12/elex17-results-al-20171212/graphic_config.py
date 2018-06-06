#!/usr/bin/env python

import custom_filters
import base_filters

COPY_GOOGLE_DOC_KEY = '1gbJAY2D-M2psQLu1gi-Sor_aq6Dz2dnelS2k8g6BqcI'

USE_ASSETS = False

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS + custom_filters.FILTERS
