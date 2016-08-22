var DATA_URL = 'https://elections.npr.org/data/results-2016-02-27.json';

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    loadData();
    // render data

    pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
}


/*
 * Load data
 */
var loadData = function() {
    d3.json(DATA_URL, function(error, data) {
      if (error) {
          return console.warn(error);
      }
      renderData(data);
    });
}


/*
 * Display data
 */
var renderData = function(data) {
    var parties = d3.keys(data);

    parties.forEach(function(d,i) {
        var containerElement = d3.select('.results.' + d);
        var partyData = data[d];
        var partyResults = partyData['results'].sort(function(a, b) {
            return d3.descending(a['votecount'], b['votecount']);
        });

        var lastUpdated = containerElement.select('.last-updated')
            .text('As of ' + partyData['lastupdated'] + ' EST');

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
                        candidate += ' <b class="icon icon-ok"></b>';
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
