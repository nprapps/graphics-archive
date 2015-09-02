#!/usr/bin/env python

import base_filters

COPY_GOOGLE_DOC_KEY = '1J5zo2QbvEh73-p7uPagI0ppWAiNdIwbCUIpgXz7fraA'

USE_ASSETS = False

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS

DEVELOPMENTS = (
    ('columbia_parc', 'Columbia Parc (formerly St. Bernard)'),
    ('lafitte', 'Faubourg Lafitte (formerly Lafitte)'),
    ('marrero', 'Marrero Commons (formerly B.W. Cooper)'),
    ('harmony_oaks', 'Harmony Oaks (formerly C.J. Peete)<sup>*</sup>'),
)
