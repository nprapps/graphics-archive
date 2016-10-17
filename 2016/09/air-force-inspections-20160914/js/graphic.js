// Global vars
var currentState = null;
var defaultState = 'co';
var pymChild = null;
var stateSelector = null;
var availStates = [ 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY' ];


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    stateSelector = d3.select('select#state-selector')
        .on('change', onDropDownChange);

    geoLocate();
    // _setLocateDefault();

    pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}


// geolocation
var geoLocate = function() {
    var cachedState = lscache.get('geo_ip_state');
    if (cachedState && cachedState !== 'undefined') {
        console.log('using the cached state');
        currentState = cachedState;
        showState(currentState);
    } else {
        if (typeof geoip2 === 'object') {
            console.log('using geoip');
            geoip2.city(onLocateIP, onLocateFail);
        }

        if (typeof geoip2 !== 'object') {
            _setLocateDefault();
        }
    }
}

var onLocateIP = function(response) {
    currentState = response.most_specific_subdivision.iso_code.toLowerCase();
    lscache.set('geo_ip_state', currentState, 1440);
    showState(currentState);
}

var onLocateFail = function(error) {
    // console.log(error);
    _setLocateDefault();
}

var _setLocateDefault = function() {
    // You can pass any state here to have a default case, or just do something else entirely here.
    // console.log('default location used');
    currentState = defaultState;
    showState(currentState);
}

// show/hide states
var showState = function(st) {
    st = checkState(st);

    d3.selectAll('.active').classed('active', false);
    d3.selectAll('.state-' + st).classed('active', true);

    updateDropDown(st);

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

// check if this is a state in our listing.
// if not, use the default state
var checkState = function(st) {
    if (!_.contains(availStates, st.toUpperCase())) {
        return defaultState;
    } else {
        return st;
    }
}

var updateDropDown = function(st) {
    var selectorItems = stateSelector.selectAll('option');
    // stateSelector[0][0].selectedIndex = 0;

    selectorItems[0].forEach(function(d,i) {
        var s = d3.select(d);
        var val = d.value;
        if (val == st) {
            s.selected = true;
            stateSelector[0][0].selectedIndex = i;
        } else {
            s.selected = false;
        }
    });
}

var onDropDownChange = function() {
    var s = d3.select(this);
    showState(s[0][0].value);
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
