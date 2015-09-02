#!/usr/bin/env python

from collections import OrderedDict

import base_filters

COPY_GOOGLE_DOC_KEY = '1U2y8WazAu44u74mrHZhTWuuYRrtssZY9VBhY-G68qKk'

USE_ASSETS = False

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300

JINJA_FILTER_FUNCTIONS = base_filters.FILTERS

QUESTIONS = OrderedDict([
    ('repairs', 'Repairing the levees, pumps and floodwalls'),
    ('business', 'Attracting more businesses and jobs to New Orleans'),
    ('medical', 'Making medical facilities and services more available'),
    ('transportation', 'Making public transportation more available'),
    ('schools', 'Strengthening the public school system'),
#     ('blight', 'Dealing with destroyed and abandoned homes and other properties'),
#     ('housing', 'Making affordable housing more available'),
    ('crime', 'Controlling crime and assuring public safety'),
])
