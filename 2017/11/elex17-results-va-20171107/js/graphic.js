var COUNTDOWN = 20;
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
            window.open('https://www.npr.org/2017/11/07/562348581/election-night-2017-close-virginia-governors-race-could-offer-midterm-clues');
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
        graphicData = RESULTS;
        initPymChild();
        return;
    }

    d3.json(DATA_URL, function(error, d) {
        if (error) {
            return console.warn(error);
        }

        graphicData = d[RESULTS_PROPERTY];
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

    var $indicator = $('.meta-footer').find('.update-indicator');
    $indicator
        .empty()
        .append('Next update: <b class="icon icon-spin3"></b> <span class="text"></span>');

    var $indicatorSpinner = $indicator.find('.icon');
    var $indicatorText = $indicator.find('.text');

    var startIndicator = function() {
        $indicatorSpinner.removeClass('animate-spin');
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
        $indicatorSpinner.addClass('animate-spin');
        $indicatorText.text('Loading');
        d3.json(DATA_URL, function(error, data) {
            graphicData = data[RESULTS_PROPERTY];

            setTimeout(function() {
                render();
                startIndicator();
            }, 500);
        });
    }

    var updateText = function() {
        if (counter > 9) {
            $indicatorText.text('0:' + counter);
        } else {
            $indicatorText.text('0:0' + counter);
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

    graphicData = graphicData.sort(function(a, b){
        return d3.descending(a['vote_count'], b['vote_count']);
    });

    var raceMetadata = graphicData[0];
    var precincts_pct = raceMetadata['precincts_pct'];
    var precincts_reporting = +raceMetadata['precincts_reporting'];
    var precincts_total = +raceMetadata['precincts_total'];
    var updated_date = raceMetadata['updated_date'];
    var updated_time = raceMetadata['updated_time'];

    var containerElement = d3.select(CONTAINER);

    var lastUpdated = containerElement.select('.last-updated')
        .text('As of ' + updated_date + ' at ' + updated_time + ' ET');

    var precincts = containerElement.select('.precincts')
        .text(function() {
            var precincts_formatted = null;
            // value is <1 or >99
            if (isNaN(precincts_pct)) {
                precincts_formatted = precincts_pct;
            } else {
                precincts_pct = +precincts_pct;
                precincts_formatted = precincts_pct.toFixed(0);
            }
            return precincts_formatted + '% of precincts reporting';
        });

    var resultsTable = containerElement.select('tbody');
    resultsTable.html('');

    graphicData.forEach(function(v, k) {
        var resultsRow = resultsTable.append('tr');
        if (v['winner'] == 'yes') {
            resultsRow.classed('winner', true);
            resultsRow.classed(v['party'].toLowerCase(), true);
        }
        resultsRow.append('td')
            .html(function() {
                var candidate = '';
                if (v['name']) {
                    candidate += v['name'];
                }
                if (v['party']) {
                    candidate += ' (' + v['party'] + ')';
                }
                if (v['winner'] == 'yes') {
                    candidate += ' <b class="icon icon-check"></b>';
                }
                return candidate;
            });
        resultsRow.append('td')
            .text(fmtComma(v['vote_count']))
            .classed('votes', true);
        resultsRow.append('td')
            .text(function() {
                var pct = +v['vote_pct'];
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
