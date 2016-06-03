var DATA_URL = '//elections.npr.org/data/results-2016-04-05.json'
var COUNTDOWN = 30;
var pymChild = null;
var isMobile = false;
var graphicData = [];


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    loadData();
}


/*
 * Load data
 */
var loadData = function() {
    d3.json(DATA_URL, function(error, d) {
      if (error) {
          return console.warn(error);
      }

      graphicData = d;

      pymChild = new pym.Child({
          renderCallback: renderInit
      });

      pymChild.onMessage('on-screen', function(bucket) {
          ANALYTICS.trackEvent('on-screen', bucket);
      });
      pymChild.onMessage('scroll-depth', function(data) {
          ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
      });
  });
}

var renderInit = function() {
    render();
    renderCountdown();
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
            graphicData = data;
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

    startIndicator();
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

    var parties = d3.keys(graphicData);

    parties.forEach(function(d,i) {
        var containerElement = d3.select('.results.' + d);
        var partyData = graphicData[d]['WI'][0];
        console.log(partyData);

        var partyResults = partyData['results'].sort(function(a, b) {
            return d3.descending(a['votecount'], b['votecount']);
        });

        var lastUpdated = containerElement.select('.last-updated')
            .text('As of ' + partyData['results'][0]['lastupdated'] + ' EDT');

        var precincts = containerElement.select('.precincts')
            .text(function() {
                var p = partyResults[0];
                return p['precinctsreportingpct'].toFixed(1) + '% of precincts reporting (' + fmtComma(p['precinctsreporting']) + ' of ' + fmtComma(p['precinctstotal']) + ')';
            });

        var resultsTable = containerElement.select('tbody');
        resultsTable.html('');

        partyResults.forEach(function(v, k) {
            var resultsRow = resultsTable.append('tr');
            if (v['winner'] == true) {
                resultsRow.classed('winner', true);
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
                    if (v['winner'] == true) {
                        candidate += ' <b class="icon icon-check"></b>';
                    }
                    return candidate;
                });
            resultsRow.append('td')
                .text(fmtComma(v['votecount']))
                .classed('votes', true);
            resultsRow.append('td')
                .text(function() {
                    var pct = v['votepct'] * 100;
                    return pct.toFixed(1) + '%';
                })
                .classed('pct', true);
        });
        var resultsRow = resultsTable.append('tr');
        resultsRow.append('td')
            .html('Other');
        resultsRow.append('td')
            .text(fmtComma(partyData['other_votecount']))
            .classed('votes', true);
        resultsRow.append('td')
            .text(function() {
                var pct = partyData['other_votepct'] * 100;
                return pct.toFixed(1) + '%';
            })
            .classed('pct', true);


        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
