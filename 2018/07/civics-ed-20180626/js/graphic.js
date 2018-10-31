var pymChild = null;
var currentState = null;
/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    // Uncomment to enable column sorting
    // var tablesort = new Tablesort(document.getElementById('state-table'));

    pymChild = new pym.Child({ });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

    // $('.state').select2();
    geoLocate();
}

var dataSeries = [{}],
    postal_state = {};

var formatData = function() {
    DATA.forEach(function (d) {
        dataSeries[d['name']] = d;
        postal_state[d['usps']] = d['name'];
    });
}();

var update = function(state, isInitialLoad) {    
    if (isInitialLoad) {
        $("select option:contains('" + state + "')").prop('selected', true);
        $(".select2-selection__rendered").text(state);
    }
    var state_data = dataSeries[state];
    $('.data-row').remove();
    $('#state-table thead:last')
        .after("<tr class='data-row'><td class='" + state + "' data-title='" + HDR_COURSE + "'><div>" + state_data['course'] + "</div></td>\
                                     <td class='" + state + "' data-title='" + HDR_PROPOSALS + "'><div>" + state_data['proposals'] + "</div></td>\
                                     <td class='" + state + "' data-title='" + HDR_EXAM + "'><div>" + state_data['exam'] + "</div></td></tr>");

    // update the iframe height
    if (pymChild) {
        pymChild.sendHeight();
    }

};


// Option selection after load
$('.state').change(function() {
    var state = $(this).find("option:selected").text();
    update(state, false);
});

var updateCurrentState = function(currentState) {
    if (currentState in postal_state) {
        update(postal_state[currentState], true);
    } else {
        _setLocateDefault();
    }

}


var geoLocate = function() {
    var cachedState = lscache.get('geo_ip_state');

    if (cachedState && cachedState !== 'undefined' && cachedState !== null) {
        // console.log(cachedState, " using cached");
        currentState = cachedState;
        updateCurrentState(currentState);
    } else {
        if (typeof geoip2 === 'object') {
            geoip2.city(onLocateIP, onLocateFail);
        }

        if (typeof geoip2 !== 'object') {
            _setLocateDefault();
        }
    }
}

var onLocateIP = function(response) {
    if (response['country']['iso_code'] == 'US' && typeof response['state'] != undefined) {
        currentState = response.most_specific_subdivision.iso_code;
        // console.log(currentState);
        lscache.set('geo_ip_state', currentState, 1440);
        updateCurrentState(currentState);
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
    // On load, for the default selected state
    $('select option:selected').each(function() {
        var state = $(this).text();
        update(state, false); 
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
