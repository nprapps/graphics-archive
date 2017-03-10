// Global vars
var BASE_DATA_URL = 'data/data.json';
var simulator = null;
var pymChild = null;
var isMobile = false;

var scenario = null;
var footer = null;
var interactive = true;
var adjustments = {
    'adjustments': {
        'white_woman': {
            'pct': 0.0,
            'turnout': 0.0,
            'label': "White Women"
        },
        'white_man': {
            'pct': 0.0,
            'turnout': 0.0,
            'label': "White Men"
        },
        'black': {
            'pct': 0.0,
            'turnout': 0.0,
            'label': "Black"
        },
        'hispanic': {
            'pct': 0.0,
            'turnout': 0.0,
            'label': "Hispanic"
        },
        'other': {
            'pct': 0.0,
            'turnout': 0.0,
            'label': "Other"
        }
    }
};

var formatData = function(data) {
    var DATA = data.data;
    _.each(DATA, function(row) {
        row.state_usps = STATE_TO_USPS[row.state];
    });
    return DATA
}

function loadJSON(callback) {
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open('GET', BASE_DATA_URL, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          }
    };
    xobj.send(null);
 }


/*
 * Update simulator initialization properties based on url params
 */
var UpdateInitVars = function(urlParams) {
    // Adjustments
    var adj = adjustments.adjustments;
    adj.white_man.pct = urlParams.margin_white_men || 0.0;
    adj.white_man.turnout = urlParams.turnout_white_men || 0.0;
    adj.white_woman.pct = urlParams.margin_white_women || 0.0;
    adj.white_woman.turnout = urlParams.turnout_white_women || 0.0;
    adj.black.pct = urlParams.margin_black || 0.0;
    adj.black.turnout = urlParams.turnout_black || 0.0;
    adj.hispanic.pct = urlParams.margin_hispanic || 0.0;
    adj.hispanic.turnout = urlParams.turnout_hispanic || 0.0;
    adj.other.pct = urlParams.margin_other || 0.0;
    adj.other.turnout = urlParams.turnout_other || 0.0;

    // scenarios
    scenario = urlParams.scenario;
    // credits
    footer = urlParams.footer;
    // interactive
    if (urlParams.interactive === false) {
        interactive = false;
    }
}


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    Ractive.DEBUG = false;
    loadJSON(function(response) {
        // Parse JSON string into object
        var data = JSON.parse(response);
        init(data);
    });
}

var init = function(data) {
    baseData = formatData(data);
    urlParams = urlparser.get();
    if (urlParams) {
        UpdateInitVars(urlParams);
    }
    createSimulator(baseData);

    pymChild = new pym.Child({
        renderCallback: render
    });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

var createSimulator = function(data) {
    //Get the adjustments from the macro parameters
    simulator = new ElectionSimulator("#usage", "#scenarios",
                                      "#table-totals", "#table-details",
                                      "#table-controls", "#footer",
                                      adjustments, interactive, footer, scenario, data, HEADERS);
}

/*
 * Render the simulator.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the map!
    renderSimulator({
        container: '#graphic',
        width: containerWidth,
        isMobile: isMobile
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderSimulator = function(config) {
    simulator.render(config);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
