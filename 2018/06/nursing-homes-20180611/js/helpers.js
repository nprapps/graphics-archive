/*
 * Basic Javascript helpers used in analytics.js and graphics code.
 */

var COLORS = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

/*
 * Convert arbitrary strings to valid css classes.
 * via: https://gist.github.com/mathewbyrne/1280286
 *
 * NOTE: This implementation must be consistent with the Python classify
 * function defined in base_filters.py.
 */
var classify = function(str) {
    return str.toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

/*
 * Convert key/value pairs to a style string.
 */
var formatStyle = function(props) {
    var s = '';

    for (var key in props) {
        s += key + ': ' + props[key].toString() + '; ';
    }

    return s;
}

/*
 * Create a SVG tansform for a given translation.
 */
var makeTranslate = function(x, y) {
    var transform = d3.transform();

    transform.translate[0] = x;
    transform.translate[1] = y;

    return transform.toString();
}

/*
 * Parse a url parameter by name.
 * via: http://stackoverflow.com/a/901144
 */
var getParameterByName = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/*
 * Convert a url to a location object.
 */
var urlToLocation = function(url) {
    var a = document.createElement('a');
    a.href = url;
    return a;
}


/*
 * Convert postal abbrs to full state names or ap abbrs
 */
var POSTAL_STATES = [];
POSTAL_STATES['AL'] = { 'full': 'Alabama', 'ap': 'Ala.' };
POSTAL_STATES['AK'] = { 'full': 'Alaska', 'ap': 'Alaska' };
POSTAL_STATES['AZ'] = { 'full': 'Arizona', 'ap': 'Ariz.' };
POSTAL_STATES['AR'] = { 'full': 'Arkansas', 'ap': 'Ark.' };
POSTAL_STATES['CA'] = { 'full': 'California', 'ap': 'Calif.' };
POSTAL_STATES['CO'] = { 'full': 'Colorado', 'ap': 'Colo.' };
POSTAL_STATES['CT'] = { 'full': 'Connecticut', 'ap': 'Conn.' };
POSTAL_STATES['DC'] = { 'full': 'District of Columbia', 'ap': 'D.C.' };
POSTAL_STATES['DE'] = { 'full': 'Delaware', 'ap': 'Del.' };
POSTAL_STATES['FL'] = { 'full': 'Florida', 'ap': 'Fla.' };
POSTAL_STATES['GA'] = { 'full': 'Georgia', 'ap': 'Ga.' };
POSTAL_STATES['HI'] = { 'full': 'Hawaii', 'ap': 'Hawaii' };
POSTAL_STATES['ID'] = { 'full': 'Idaho', 'ap': 'Idaho' };
POSTAL_STATES['IL'] = { 'full': 'Illinois', 'ap': 'Ill.' };
POSTAL_STATES['IN'] = { 'full': 'Indiana', 'ap': 'Ind.' };
POSTAL_STATES['IA'] = { 'full': 'Iowa', 'ap': 'Iowa' };
POSTAL_STATES['KS'] = { 'full': 'Kansas', 'ap': 'Kan.' };
POSTAL_STATES['KY'] = { 'full': 'Kentucky', 'ap': 'Ky.' };
POSTAL_STATES['LA'] = { 'full': 'Louisiana', 'ap': 'La.' };
POSTAL_STATES['ME'] = { 'full': 'Maine', 'ap': 'Maine' };
POSTAL_STATES['MD'] = { 'full': 'Maryland', 'ap': 'Md.' };
POSTAL_STATES['MA'] = { 'full': 'Massachusetts', 'ap': 'Mass.' };
POSTAL_STATES['MI'] = { 'full': 'Michigan', 'ap': 'Mich.' };
POSTAL_STATES['MN'] = { 'full': 'Minnesota', 'ap': 'Minn.' };
POSTAL_STATES['MS'] = { 'full': 'Mississippi', 'ap': 'Miss.' };
POSTAL_STATES['MO'] = { 'full': 'Missouri', 'ap': 'Mo.' };
POSTAL_STATES['MT'] = { 'full': 'Montana', 'ap': 'Mont.' };
POSTAL_STATES['NE'] = { 'full': 'Nebraska', 'ap': 'Neb.' };
POSTAL_STATES['NV'] = { 'full': 'Nevada', 'ap': 'Nev.' };
POSTAL_STATES['NH'] = { 'full': 'New Hampshire', 'ap': 'N.H.' };
POSTAL_STATES['NJ'] = { 'full': 'New Jersey', 'ap': 'N.J.' };
POSTAL_STATES['NM'] = { 'full': 'New Mexico', 'ap': 'N.M.' };
POSTAL_STATES['NY'] = { 'full': 'New York', 'ap': 'N.Y.' };
POSTAL_STATES['NC'] = { 'full': 'North Carolina', 'ap': 'N.C.' };
POSTAL_STATES['ND'] = { 'full': 'North Dakota', 'ap': 'N.D.' };
POSTAL_STATES['OH'] = { 'full': 'Ohio', 'ap': 'Ohio' };
POSTAL_STATES['OK'] = { 'full': 'Oklahoma', 'ap': 'Okla.' };
POSTAL_STATES['OR'] = { 'full': 'Oregon', 'ap': 'Ore.' };
POSTAL_STATES['PA'] = { 'full': 'Pennsylvania', 'ap': 'Pa.' };
POSTAL_STATES['PR'] = { 'full': 'Puerto Rico', 'ap': 'P.R.' };
POSTAL_STATES['RI'] = { 'full': 'Rhode Island', 'ap': 'R.I.' };
POSTAL_STATES['SC'] = { 'full': 'South Carolina', 'ap': 'S.C.' };
POSTAL_STATES['SD'] = { 'full': 'South Dakota', 'ap': 'S.D.' };
POSTAL_STATES['TN'] = { 'full': 'Tennessee', 'ap': 'Tenn.' };
POSTAL_STATES['TX'] = { 'full': 'Texas', 'ap': 'Texas' };
POSTAL_STATES['UT'] = { 'full': 'Utah', 'ap': 'Utah' };
POSTAL_STATES['VT'] = { 'full': 'Vermont', 'ap': 'Vt.' };
POSTAL_STATES['VA'] = { 'full': 'Virginia', 'ap': 'Va.' };
POSTAL_STATES['WA'] = { 'full': 'Washington', 'ap': 'Wash.' };
POSTAL_STATES['WV'] = { 'full': 'West Virginia', 'ap': 'W.Va.' };
POSTAL_STATES['WI'] = { 'full': 'Wisconsin', 'ap': 'Wis.' };
POSTAL_STATES['WY'] = { 'full': 'Wyoming', 'ap': 'Wyo.' };

var statePostalToFull = function(statePostal) {
    if (typeof POSTAL_STATES[statePostal] == 'undefined') {
        console.warn('No full state name available for ' + statePostal);
    } else  {
        return POSTAL_STATES[statePostal]['full'];
    }
}

var statePostalToAP = function(statePostal) {
    if (typeof POSTAL_STATES[statePostal] == 'undefined') {
        console.warn('No AP abbreviation available for ' + statePostal);
    } else  {
        return POSTAL_STATES[statePostal]['ap'];
    }
}
