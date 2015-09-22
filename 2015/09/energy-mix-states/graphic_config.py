#!/usr/bin/env python

import os

COPY_GOOGLE_DOC_KEY = '1DnTygnUfjMp4ahUpLR1cYD5JRMwXz61WoavN40H6CNY'

if os.path.exists('../graphics/energy-mix-states/data.json'):
    with open('../graphics/energy-mix-states/data.json') as f:
        DATA = f.read() 
else:
    DATA = []
