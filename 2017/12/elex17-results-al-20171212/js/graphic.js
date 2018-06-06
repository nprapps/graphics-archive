var COUNTDOWN = 10;
var pymChild = null;
var isHomepage = false;
var isMobile = false;
var graphicData = [];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    // check if this is on the homepage
    if (getParameterByName('mode') == 'hp') {
        isHomepage = true;
        d3.select('body').classed('hp', true);
    }

    if (isHomepage) {
        d3.select('.graphic').on('click', function() {
            window.open(STORY_URL);
        });
    }

    loadData();
}


/*
 * Load data
 */
var loadData = function() {
    if (!DATA_URL) {
        // We've initialized our results data through the `RESULTS` global.
        // This usually happens after the election when we no longer need
        // to do a live update.
        graphicData = RESULTS['results'][RESULTS_PROPERTY];
        initPymChild();
        return;
    }

    d3.json(DATA_URL, function(error, d) {
        if (error) {
            return console.warn(error);
        }
        graphicData = d['results'][RESULTS_PROPERTY];

        initPymChild();
  });
}

var initPymChild = function() {
    pymChild = new pym.Child({
      renderCallback: renderInit
    });

    pymChild.onMessage('on-screen', function(bucket) {
      ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
      ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
};

var renderInit = function() {
    render();
    if (DATA_URL) {
        renderCountdown();
    }
}

var renderCountdown = function() {
    var counter = null;
    var interval = null;

    var indicator = d3.select('.meta-footer .update-indicator');
    indicator.html('Next update: <b class="icon icon-spin3"></b> <span class="text"></span>');

    var indicatorSpinner = indicator.select('.icon');
    var indicatorText = indicator.select('.text');

    var startIndicator = function() {
        indicatorSpinner.classed('animate-spin', false);
        counter = COUNTDOWN;
        updateText();
        interval = setInterval(updateIndicator, 1000);
    }

    var updateIndicator = function() {
        counter--;
        updateText();
        if (counter === 0) {
            stopIndicator();
        }
    }

    var stopIndicator = function() {
        clearInterval(interval);
        indicatorSpinner.classed('animate-spin', true);
        indicatorText.text('Loading');
        d3.json(DATA_URL, function(error, data) {
            graphicData = data['results'][RESULTS_PROPERTY];

            setTimeout(function() {
                render();
                startIndicator();
            }, 500);
        });
    }

    var updateText = function() {
        if (counter > 9) {
            indicatorText.text('0:' + counter);
        } else {
            indicatorText.text('0:0' + counter);
        }
    }

    if (DATA_URL) {
        startIndicator();
    }
}

/*
 * Display data
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

    var containerElement = d3.select(CONTAINER);

    var lastUpdated = containerElement.select('.last-updated')
        .text('As of ' + graphicData['lastupdated'] + ' ET');

    var precincts = containerElement.select('.precincts')
        .text(graphicData['nprformat_precinctsreportingpct'] + ' of precincts reporting');

    var resultsTable = containerElement.select('tbody');
    resultsTable.html('');

    var candidatesData = graphicData['candidates'];

    candidatesData = candidatesData.sort(function(a, b){
        return d3.descending(a['votecount'], b['votecount']);
    });

    candidatesData.forEach(function(v, k) {
        var resultsRow = resultsTable.append('tr');
        if (v['winner'] == true || v['winner'] == 'yes') {
            resultsRow.classed('winner', true);
            resultsRow.classed(v['party'].toLowerCase(), true);
        }
        resultsRow.append('td')
            .html(function() {
                var candidate = '';
                if (v['first']) {
                    candidate += v['first'] + ' ';
                }
                if (v['last']) {
                    candidate += v['last'];
                }
                if (v['party'] && v['party'] != 'NPD') {
                    candidate += ' (' + v['party'] + ')';
                }
                if (v['winner'] == true || v['winner'] == 'yes') {
                    candidate += ' <b class="icon icon-check"></b>';
                }
                return candidate;
            });
        resultsRow.append('td')
            .text(fmtComma(v['votecount']))
            .classed('votes', true);
        resultsRow.append('td')
            .text(function() {
                var pct = +v['votepct'] * 100;
                return pct.toFixed(1) + '%';
            })
            .classed('pct', true);
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
