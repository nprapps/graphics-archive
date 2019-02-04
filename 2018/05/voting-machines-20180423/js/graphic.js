// Global vars
var CACHE_MAX_AGE = 1440;
var pymChild = null;
var isMobile = false;
var firstLoad = false;

// for debugging
// lscache.remove('geo_ip_country');
// lscache.remove('geo_ip_county_fips');

// Location variables
var currentCountry = null;
var currentFIPS = null;
var executedGeoFill = false;

// Template variables
var executedTypeaheadFill = false;
var geotext_template = _.template(
    d3.select('script#geotext-template').html()
);
var toptext_template = _.template(
    d3.select('script#toptext-template').html()
);
var img_template = _.template(
    d3.select('script#img-template').html()
);

// Typeahead variables
var searchBox = '#search .typeahead';

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    // check if this is on the homepage
    if (getParameterByName('mode') == 'hp') {
        d3.select('body').classed('hp', true);
    }

    _setLocateDefault();
    geoLocate();
    initSearch();

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

}

/*
 * Geolocation
 */
var geoLocate = function() {
    // check if this user is in the U.S. (and filter out EU folks)
    var cachedCountry = lscache.get('geo_ip_country');

    // did we cache this value already?
    if (cachedCountry && cachedCountry != 'undefined' && cachedCountry !== null) {
        currentCountry = cachedCountry;

        // if the user is in the U.S., geolocate them further
        if (currentCountry === 'US') {
            geoLocateLocal();
        } else {
            _setLocateDefault();
        }
    // if we didn't cache it, query geoip2 for the user's country.
    // use geoip2.country() so we only return a limited set of user info.
    } else {
        if (typeof geoip2 === 'object') {
            geoip2.country(onLocateCountry, onLocateFail);
        } else {
            _setLocateDefault();
        }
    }
}

// handle geoip2 country response
var onLocateCountry = function(response) {
    // cache the response
    currentCountry = response['country']['iso_code'];
    lscache.set('geo_ip_country', currentCountry, CACHE_MAX_AGE);

    // if they're in the US, geolocate further
    if (currentCountry == 'US') {
        geoLocateLocal();
    } else {
        _setLocateDefault();
    }
}

// estimate the user's lat/lon so we eventually
// can try to derive what county they're in
var geoLocateLocal = function() {
    // check if we did this before and cached the FIPS code
    var cachedFIPS = lscache.get('geo_ip_county_fips');
    // console.log('cached FIPS', cachedFIPS);

    // Check if there's a cached location
    if (cachedFIPS && cachedFIPS != 'undefined' && cachedFIPS !== null) {
        currentFIPS = cachedFIPS;
        // if we've cached the FIPS, we can skip geolocation and Wherewolf
        // and directly load data for that county
        getLocationDetails(currentFIPS, true);
    } else {
        if (typeof geoip2 === 'object') {
            geoip2.city(onLocateIP, onLocateFail);
        }

        if (typeof geoip2 !== 'object') {
            _setLocateDefault();
        }
    }
}

// handle geoip2 city response
var onLocateIP = function(response) {
    // Check if we got a workable lat/lon in the geoip2 response
    if (response.location.latitude != undefined && response.location.longitude != undefined) {
        var locationLat = response.location.latitude;
        var locationLong = response.location.longitude;

        // use Wherewolf to figure out which county this lat/lon falls into
        getCounty(locationLat, locationLong);
    } else {
        _setLocateDefault();
    }
}

var onLocateFail = function(error) {
    // console.log('onLocateFail', error);
    _setLocateDefault();
}

// default behavior (for international users and cases where geolocation failed)
var _setLocateDefault = function() {
    // You can pass any state here to have a default case, or just do something else entirely here.
    d3.select('div.loading').classed('hidden', true);
    d3.select('div.not-found').classed('hidden', false);
    d3.select('div.content').classed('hidden', true);
}

// Use Wherewolf to match lat/lon against a county topojson file
var getCounty = function(locationLat, locationLong) {
    // Test location in a city
    var testLat = 36.859118,
        testLng = -76.033469;

    // Test location outside the us
    var intLat = 10.382975,
        intLng = -75.496510;

    // Initiate Wherewolf
    var ww = Wherewolf();

    // Import topojson for Wherewolf then lookup lat, lng
    $.getJSON('data/us-counties-topojson.json', function(d) {
        ww.add('objects', d, 'us-counties-export');

        // var result = ww.find({ lat: intLat, lng: intLng });
        // var result = ww.find({ lat: testLat, lng: testLng });
        var result = ww.find({ lat: locationLat, lng: locationLong });
        getLocationDetails(result['objects'], true);
    });
}

/*
 * Location lookup and details
 */
var getLocationDetails = function(currentFIPS, geoLocated) {
    var countyName = null;
    var geoId = '';
    if (geoLocated == undefined) {
        geoLocated = false;
    }

    // check if the location data came from Wherewolf ('object')
    // or if it came from cache or search results
    if (typeof currentFIPS === 'object') {
        geoId = currentFIPS.GEOID;
    } else {
        geoId = currentFIPS;
    }

    // if this county was geolocated, cache the FIPS value
    if (geoLocated) {
        lscache.set('geo_ip_county_fips', geoId, CACHE_MAX_AGE);
    }

    // Look up current county in voting machines data
    var updateGeotext = function() {
        var foundCounty;
        for (row in COUNTIES) {
            if (COUNTIES[row]['fips'] != geoId) {
                continue;
            } else {
                foundCounty = COUNTIES[row];
            }
        }

        // Pass template variables
        var template_data = {
            trail: MACHINES[foundCounty['polling_place_voting_system']]['audit'],
            based_on_location: geoLocated,
            machine: foundCounty['polling_place_voting_system'],
            machine_description: MACHINES[foundCounty['polling_place_voting_system']]['description'],
            county: foundCounty['county_state_full'],
            voting_on: MACHINES[foundCounty['polling_place_voting_system']]['voting_on'],
            experts_say: MACHINES[foundCounty['polling_place_voting_system']]['experts_say'],
            experts_say2: MACHINES[foundCounty['polling_place_voting_system']]['experts_say2'],
            img: (MACHINES[foundCounty['polling_place_voting_system']]['img']).toLowerCase()
        };

        // Send information to templates
        d3.select('#geotext').html(geotext_template(template_data));
        d3.select('#toptext').html(toptext_template(template_data));
        d3.select('#machine-img').html(img_template(template_data));

        // Unhide if necessary
        d3.select('div.loading').classed('hidden', true);
        d3.select('div.not-found').classed('hidden', true);
        d3.select('div.content').classed('hidden', false);

        // Send as typeahead placeholder
        if (!executedTypeaheadFill) {
            fillTypeahead(foundCounty['county_state_full']);
        }
    }

    // Update text and send height
    updateGeotext();

    $('.content').imagesLoaded({},
        function() {
            if (pymChild) {
                pymChild.sendHeight();
            }
        }
    );
}

/*
 * Initialize the search box
 * Uses typeahead.js / bloodhound for predictive search from json file
 */
var initSearch = function() {
    var counties = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('county_state_full'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        identify: function(obj) {
            return obj.county_state_full;
        },
        prefetch: 'data/voting-machines-export.json'
    });

    // Define typeahead options and sources
    $(searchBox).typeahead({
        hint: true,
        highlight: true,
        minLength: 1
    }, {
        name: 'county',
        display: 'county_state_full',
        source: counties,
        limit: 5
    });

    // Clear the placeholder when user types
    $(searchBox).keypress(function(ev) {
        $('#search .typeahead').attr('placeholder', '');
    }).bind('typeahead:select', function(ev, suggestion) {
        for (objs in suggestion) {
            getLocationDetails(suggestion['fips'], false);
        }
    });
}

// Fill typeahead box with user's location the first time
// the page loads
var fillTypeahead = function(countyName) {
    executedTypeaheadFill = true;

    $('#search .typeahead').val(countyName);
    // $('#search .typeahead').attr('placeholder', countyName).val('').focus().blur();
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
