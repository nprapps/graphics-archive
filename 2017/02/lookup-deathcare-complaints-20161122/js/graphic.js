// Global vars
var pymChild = null;
var isMobile = false;
var stateLists = null;
var stateLinks = null;
var currentState = null;
var graphicWrapper = null;
var graphicTop = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    stateLists = d3.selectAll('.state');
    stateLists.classed('active', false);
    stateLinks = d3.selectAll('.has-results');
    stateLinks.on('click', onStateLinkClicked);

    graphicWrapper = document.getElementById('graphic');
    graphicTop = graphicWrapper.getBoundingClientRect().top;

    pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

    geoLocate();
}

var onStateLinkClicked = function() {
    var t = d3.select(this);
    var tState = t[0][0].classList[0];
    pymChild.sendMessage('scrollTo', graphicTop);
    showState(tState);
}

var showState = function(s) {
    stateLists.classed('active', false);
    d3.select('.state.' + s).classed('active', true);

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * geolocation
 */
var geoLocate = function() {
    var cachedState = lscache.get('geo_ip_state');

    if (cachedState && cachedState !== 'undefined' && cachedState !== null) {
        // console.log('using the cached state');
        currentState = cachedState.toUpperCase();
        showState(classify(STATE_POSTAL_TO_FULL[currentState]));
    } else {
        if (typeof geoip2 === 'object') {
            // console.log('using geoip');
            geoip2.city(onLocateIP, onLocateFail);
        }

        if (typeof geoip2 !== 'object') {
            _setLocateDefault();
        }
    }
}

var onLocateIP = function(response) {
    // console.log('geoip response', response);
    if (response['country']['iso_code'] == 'US' && typeof response['state'] != undefined) {
        currentState = response.most_specific_subdivision.iso_code;
        // console.log('onLocateIP: ' + currentState);
        lscache.set('geo_ip_state', currentState, 1440);
        showState(classify(STATE_POSTAL_TO_FULL[currentState]));
    } else {
        // console.log('onLocateIP: User is not in the U.S., or no state detected.');
        _setLocateDefault();
    }
}

var onLocateFail = function(error) {
    console.warn(error);
    _setLocateDefault();
}

var _setLocateDefault = function() {
    // Do nothing. User will see the overall list of states.
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
