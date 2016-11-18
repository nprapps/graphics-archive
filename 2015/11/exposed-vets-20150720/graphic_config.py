#!/usr/bin/env python

import locale
locale.setlocale(locale.LC_ALL, 'en_US')

COPY_GOOGLE_DOC_KEY = '1TDwEPeBo9AB2b3suKosMrE9EwbkQDBXWPKqlNPQ22-M'

USE_ASSETS = False

# Use these variables to override the default cache timeouts for this graphic
# DEFAULT_MAX_AGE = 20
# ASSETS_MAX_AGE = 300

def comma_format(value):
    return locale.format('%d', float(value), grouping=True)

AP_MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
AP_TABLE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
ORDINAL_SUFFIXES = { 1: 'st', 2: 'nd', 3: 'rd' }

USPS_TO_AP = {
	'AL': 'Ala.',
	'AK': 'Alaska',
	'AR': 'Ark.',
	'AZ': 'Ariz.',
	'CA': 'Calif.',
	'CO': 'Colo.',
	'CT': 'Conn.',
	'DC': 'DC',
	'DE': 'Del.',
	'FL': 'Fla.',
	'GA': 'Ga.',
	'HI': 'Hawaii',
	'IA': 'Iowa',
	'ID': 'Idaho',
	'IL': 'Ill.',
	'IN': 'Ind.',
	'KS': 'Kan.',
	'KY': 'Ky.',
	'LA': 'La.',
	'MA': 'Mass.',
	'MD': 'Md.',
	'ME': 'Maine',
	'MI': 'Mich.',
	'MN': 'Minn.',
	'MO': 'Mo.',
	'MS': 'Miss.',
	'MT': 'Mont.',
	'NC': 'N.C.',
	'ND': 'N.D.',
	'NE': 'Neb.',
	'NH': 'N.H.',
	'NJ': 'N.J.',
	'NM': 'N.M.',
	'NV': 'Nev.',
	'NY': 'N.Y.',
	'OH': 'Ohio',
	'OK': 'Okla.',
	'OR': 'Ore.',
	'PA': 'Pa.',
    'PR': 'P.R.',
	'RI': 'R.I.',
	'SC': 'S.C.',
	'SD': 'S.D.',
	'TN': 'Tenn.',
	'TX': 'Texas',
	'UT': 'Utah',
	'VA': 'Va.',
	'VT': 'Vt.',
	'WA': 'Wash.',
	'WI': 'Wis.',
	'WV': 'W.Va.',
	'WY': 'Wyo.'
}

USPS_TO_STATE = {
	'AL': 'Alabama',
	'AK': 'Alaska',
	'AR': 'Arkansas',
	'AZ': 'Arizona',
	'CA': 'California',
	'CO': 'Colorado',
	'CT': 'Connecticut',
	'DC': 'District of Columbia',
	'DE': 'Delaware',
	'FL': 'Florida',
	'GA': 'Georgia',
	'HI': 'Hawaii',
	'IA': 'Iowa',
	'ID': 'Idaho',
	'IL': 'Illinois',
	'IN': 'Indiana',
	'KS': 'Kansas',
	'KY': 'Kentucky',
	'LA': 'Louisiana',
	'MA': 'Massachusetts',
	'MD': 'Maryland',
	'ME': 'Maine',
	'MI': 'Michigan',
	'MN': 'Minnesota',
	'MO': 'Missouri',
	'MS': 'Mississippi',
	'MT': 'Montana',
	'NC': 'North Carolina',
	'ND': 'North Dakota',
	'NE': 'Nebraska',
	'NH': 'New Hampshire',
	'NJ': 'New Jersey',
	'NM': 'New Mexico',
	'NV': 'Nevada',
	'NY': 'New York',
	'OH': 'Ohio',
	'OK': 'Oklahoma',
	'OR': 'Oregon',
	'PA': 'Pennsylvania',
    'PR': 'Puerto Rico',
	'RI': 'Rhode Island',
	'SC': 'South Carolina',
	'SD': 'South Dakota',
	'TN': 'Tennessee',
	'TX': 'Texas',
	'UT': 'Utah',
	'VA': 'Virginia',
	'VT': 'Vermont',
	'WA': 'Washington',
	'WI': 'Wisconsin',
	'WV': 'West Virginia',
	'WY': 'Wyoming'
}

def ordinal(num):
    num = int(num)

    if 10 <= num % 100 <= 20:
        suffix = 'th'
    else:
        suffix = ORDINAL_SUFFIXES.get(num % 10, 'th')

    return unicode(num) + suffix

def ap_date(value):
    if not value:
        return ''

    bits = unicode(value).split('/')

    if len(bits) == 1:
        month = '?'
        day = '?'
        year = bits[0]
    elif len(bits) == 2:
        month = bits[0]
        day = '?'
        year = bits[1]
    else:
        month, day, year = bits

    output = ''

    if '?' not in month:
        output = AP_MONTHS[int(month) - 1]

        # Not including day for privacy reasons
        # if '?' not in day:
        #     output += ' ' + unicode(int(day))
        #
        #     if '?' not in year:
        #         output += ', '
        output += ' '

    if '?' not in year:
        output += year

    return output

def usps_to_ap_state(usps):
    return USPS_TO_AP[unicode(usps)]

def usps_to_state(usps):
    return USPS_TO_STATE[unicode(usps)]

JINJA_FILTER_FUNCTIONS = [
    comma_format,
    ordinal,
    ap_date,
    usps_to_ap_state,
    usps_to_state
]
