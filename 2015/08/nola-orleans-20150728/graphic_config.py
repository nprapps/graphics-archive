#!/usr/bin/env python

import base_filters

COPY_GOOGLE_DOC_KEY = '1lHS8vOdt8FDGV1hYOGuVYDQJbJSlxgfrJBgMMdKWMVw'

USE_ASSETS = False

PARISHES = [
    'orleans',
    'jefferson',
    'st-bernard',
    'st-tammany',
    # 'plaquemines',
    # 'st-charles',
    # 'st-john',
    'metro'
]

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS
