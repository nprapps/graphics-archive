// global vars
var currentStateISO = null;
var currentState = null;
var activeState = null;
var msgLoading = null;
var noAthletes = null;
var msgNoAthletes = null;
var statusText = null;
var stateSelector = null;
var showAll = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    msgLoading = d3.select('.loading');
    noAthletes = d3.select('.no-athletes');
    statusText = d3.select('#status');
    stateSelector = d3.select('select#state-selector')
        .on('change', onDropDownChange);
    showAll = d3.select('#show-all')
        .on('click', onClickShowAll);

    pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

    geoLocate();
    _setLocateDefault();

    msgLoading.remove();
    d3.select('.menu').classed('visible', true);
}

// geolocation
var geoLocate = function() {
    if (typeof geoip2 === 'object') {
        geoip2.city(onLocateIP, onLocateFail);
    }

    if (typeof geoip2 !== 'object') {
        _setLocateDefault();
    }
}

var onLocateIP = function(response) {
    currentState = response.most_specific_subdivision.names.en;
    currentStateISO = response.most_specific_subdivision.iso_code.toLowerCase();
    showState(currentStateISO, currentState);
}

var onLocateFail = function(error) {
    // console.log('onLocateFail', error);
    _setLocateDefault();
}

var _setLocateDefault = function() {
    // You can pass any state here to have a default case, or just do something else entirely here.
    currentStateISO = 'all';
    showState(currentStateISO, currentState);
}

// show/hide states
var showState = function(st, stName) {
    // msgNoAthletes = 'No athletes from ' + stName + '. Showing all...';
    msgNoAthletes = 'No athletes from this state. Showing all...';
    d3.selectAll('.active').classed('active', false);
    var selectedAthletes = d3.selectAll('.st-' + st).classed('active', true);

    if (selectedAthletes.size() === 0) {
        noAthletes.html(msgNoAthletes);
        noAthletes.classed('visible', true);
        // st = 'all';
        d3.selectAll('.st-all').classed('active', true);
    } else {
        noAthletes.classed('visible', false);
    }

    updateDropDown(st);

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var updateDropDown = function(st) {
    var selectorItems = stateSelector.selectAll('option');

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
    var s = this[this.selectedIndex];
    showState(s.value, s.outerText);
}

var onClickShowAll = function() {
    showState('all', null);
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
// window.onload = onWindowLoaded;
onWindowLoaded();
