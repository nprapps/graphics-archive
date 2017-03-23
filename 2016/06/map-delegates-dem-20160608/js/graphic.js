// Global vars
var DATA_URL = '//elections.npr.org/data/delegates.json';
var JUMBO_THRESHOLD = 800;
var pymChild = null;
var isMobile = false;
var isJumbo = false;
var parties = [];
var lastUpdated = '';
var delegateData = [];

var candidateFull = [];
candidateFull['Clinton'] = 'Hillary Clinton';
candidateFull['Cruz'] = 'Ted Cruz';
candidateFull['Kasich'] = 'John Kasich';
candidateFull['Rubio'] = 'Marco Rubio';
candidateFull['Sanders'] = 'Bernie Sanders';
candidateFull['Trump'] = 'Donald Trump';

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadData(DATA_URL);
    } else {
        pymChild = new pym.Child({});

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            data = JSON.parse(data);
            ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });
    }
}

/*
 * Load data from a JSON file
 */
var loadData = function(url) {
    d3.json(url, function(error, data) {
        delegateData = data;
        parties = d3.keys(delegateData['nation']);

        formatData();

        lastUpdated = data['last_updated'];
        var source = d3.select('.footer p');
        var sourceText = source.text() + ' as of ' + lastUpdated + ' EDT';
        source.text(sourceText);

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
    });
}

/*
 * Format data for D3.
 */
var formatData = function() {
    DATA_DEM.forEach(function(d) {
        d['total_dels'] = +d['total_dels'];
    });
    DATA_GOP.forEach(function(d) {
        d['total_dels'] = +d['total_dels'];
    });

    var states = d3.keys(delegateData);

    states.forEach(function(s, sk) {
        parties.forEach(function(p, pk) {
            if (typeof delegateData[s][p] != 'undefined') {
                delegateData[s][p].forEach(function(d, i) {
                    d['delegates_count'] = +d['delegates_count'];
                    d['superdelegates_count'] = +d['superdelegates_count'];
                    d['pledged_delegates_count'] = d['delegates_count'] - d['superdelegates_count'];

                    delete d['candidateid'];
                    delete d['d1'];
                    delete d['d7'];
                    delete d['d30'];
                    delete d['id'];
                });

                delegateData[s][p] = delegateData[s][p].filter(function(d) {
                    return d['last'] != 'Rubio' && d['last'] != 'Carson' && d['last'] != 'Bush' && d['last'] != 'Paul' && d['last'] != 'Huckabee' && d['last'] != 'Fiorina' && d['last'] != 'Gilmore' && d['last'] != 'Christie';
                    // return d['last'] != 'Carson' && d['last'] != 'Bush' && d['last'] != 'Paul' && d['last'] != 'Huckabee' && d['last'] != 'Fiorina' && d['last'] != 'Gilmore' && d['last'] != 'Christie';
                });
            }
        });
    });
}

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 33;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        isJumbo = false;
        graphicWidth = containerWidth;
    } else if (containerWidth >= JUMBO_THRESHOLD) {
        isMobile = false;
        isJumbo = true;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    } else {
        isMobile = false;
        isJumbo = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Render the chart!
    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    var p = 'dem';

    // parties.forEach(function(p, a) {
        var partyContainer = containerElement.append('div')
            .attr('class', 'map-party ' + classify(p));

        var delsNeeded = +delegateData['nation'][p][0]['party_need'];
        var partyName = null;
        switch(p) {
            case 'dem':
                partyName = 'Democratic';
                break;
            case 'gop':
                partyName = 'Republican';
                break;
        }

        // var partyHeader = partyContainer.append('h3');
        // partyHeader.text(partyName + ' Candidates (' + fmtComma(delsNeeded) + ' needed)');

        var candidates = _.pluck(delegateData['nation'][p], 'last');
        candidates.forEach(function(d, i) {
            var mapContainer = partyContainer.append('div')
                .attr('class', 'map')
                .attr('id', 'map-' + classify(d))
                .attr('style', function() {
                    if (!isMobile) {
                        return 'width: ' + graphicWidth + 'px;';
                    }
                });

            var partyData = eval('DATA_' + p.toUpperCase());

            renderMap({
                container: '#map-' + classify(d),
                width: graphicWidth,
                map: '#' + p + '-map',
                party: classify(p),
                candidate: d,
                data: partyData
            });
        });
    // });

    // renderGraphic({
    //     container: '#graphic',
    //     width: containerWidth,
    //     data: DATA_DEM
    // });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a graphic.
 */
var renderMap = function(config) {
    // Add header
    d3.select(config['container']).append('h4')
        .html(function() {
            if (config['candidate'] == 'Sanders') {
                return candidateFull[config['candidate']] + '&rsquo; Delegate Wins';
            } else {
                return candidateFull[config['candidate']] + '&rsquo;s Delegate Wins';
            }
        });

    var totalData = delegateData['nation'][config['party']].filter(function(v,k) {
        return v['last'] == config['candidate'];
    });
    var total_dels = totalData[0].delegates_count;
    var pledged_delegates_count = totalData[0].pledged_delegates_count;
    var superdelegates_count = totalData[0].superdelegates_count;

    d3.select(config['container'])
        .append('h5')
        .html('<span class="delegates">' + fmtComma(total_dels) + ' delegates</span>');

    if (config['party'] == 'dem') {
        d3.select(config['container'])
            .append('h6')
            .html('<span class="pledged">' + fmtComma(pledged_delegates_count) + ' pledged</span> + <span class="super">' + fmtComma(superdelegates_count) + ' super</span>');
    }

    // Copy map template
    var containerElement = d3.select(config['container'])
        .append('div')
        .attr('class', 'map-wrapper');
    var template = d3.select(config['map']);
    containerElement.html(template.html());
    var mapElement = containerElement.select('svg');

    var scaleFactor = 30;
    config['data'].forEach(function(d,i) {
        var s = d['usps'];
        var stateBox = mapElement.select('.' + classify(s));
        var stateBoxTotal = stateBox.select('.total');

        var stateDelegateData = delegateData[s][config['party']].filter(function(v,k) {
            return v['last'] == config['candidate'];
        });

        var stateDelegates = stateDelegateData[0]['delegates_count'];
        var statePledgedDelegates = stateDelegateData[0]['pledged_delegates_count'];
        var totalDelegates = +d['total_dels'];
        var pctDelegatesWon = (stateDelegates / totalDelegates) * 100;

        var dx = null;
        var dy = null;
        var delegateThreshold = null;
        switch(config['party']) {
            case 'dem':
                dx = 7;
                dy = 20;
                delegateThreshold = 40;
                break;
            case 'gop':
                dx = 5;
                dy = 18;
                delegateThreshold = 30;
                break;
        }

        if (stateDelegates > 0) {
            stateBox.classed('has-delegates', true);
        }

        var label = stateBox.select('text')
            .attr('x', function() {
                var boxX = Number(stateBoxTotal.attr('x'));
                return boxX;
            })
            .attr('y', function() {
                var boxY = Number(stateBoxTotal.attr('y'));
                return boxY;
            })
            .attr('dx', 3)
            .attr('dy', -10);

        // decide whether to show the state label
        var showLabel = true;
        if (s == 'AS' && s == 'DA' && s == 'GU' && s == 'MP' && s == 'VI' && s == 'UN') {
            showLabel = false;
        }
        var labelBbox = label.node().getBBox();
        if (labelBbox.width > (Number(stateBoxTotal.attr('width')) - (dx * 2))) {
            showLabel = false;
        }
        if (showLabel) {
            stateBox.classed('always-show', true);
            label
                .attr('dx', dx)
                .attr('dy', dy);
        } else {
            stateBox.classed('hidden', true);
        }

        stateBox.insert('rect', 'text')
            .attr('class', 'candidate')
            .attr('width', function() {
                return Math.floor(Math.sqrt(stateDelegates * scaleFactor));
            })
            .attr('height', function() {
                return Math.floor(Math.sqrt(stateDelegates * scaleFactor));
            })
            .attr('x', function() {
                var boxX = Number(stateBoxTotal.attr('x'));
                return boxX;
            })
            .attr('y', function() {
                var boxY = Number(stateBoxTotal.attr('y'));
                return boxY;
            });

        if (config['party'] == 'dem') {
            stateBox.insert('rect', 'text')
                .attr('class', 'candidate pledged')
                .attr('width', function() {
                    return Math.floor(Math.sqrt(statePledgedDelegates * scaleFactor));
                })
                .attr('height', function() {
                    return Math.floor(Math.sqrt(statePledgedDelegates * scaleFactor));
                })
                .attr('x', function() {
                    var boxX = Number(stateBoxTotal.attr('x'));
                    return boxX;
                })
                .attr('y', function() {
                    var boxY = Number(stateBoxTotal.attr('y'));
                    return boxY;
                });
        }

        // show mouseover state label tooltips on larger screens
        if (!isMobile) {
            var showTooltip = function() {
                var t = d3.select(this);
                var c = t.attr('class').split(' ');

                // highlight all instances of this state
                d3.selectAll('.map .' + c[0])
                    .classed('active', true);

                // tooltip label for smallest states
                if (!t.classed('always-show')) {
                    t.classed('show-label', true)
                        .moveToFront()
                        .insert('rect', 'text')
                            .attr('class', 'text-bg')
                            .attr('x', function() {
                                var bbox = d3.select(this.parentNode).select('text').node().getBBox();
                                return bbox.x - 3;
                            })
                            .attr('y', function() {
                                var bbox = d3.select(this.parentNode).select('text').node().getBBox();
                                return bbox.y - 2;
                            })
                            .attr('width', function() {
                                var bbox = d3.select(this.parentNode).select('text').node().getBBox();
                                return bbox.width + 6;
                            })
                            .attr('height', function() {
                                var bbox = d3.select(this.parentNode).select('text').node().getBBox();
                                return bbox.height + 4;
                            });
                }
            }

            var hideTooltip = function() {
                var t = d3.select(this);
                var c = t.attr('class').split(' ');

                d3.selectAll('.map .' + c[0])
                    .classed('active', false)
                    .classed('show-label', false);

                t.select('.text-bg').remove();
            }

            stateBox
                .on('mouseover', showTooltip)
                .on('mouseout', hideTooltip);
        }
    });
}

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};


var renderGraphic = function(config) {
    // console.log(config['data']);

    var aspectWidth = 4;
    var aspectHeight = 3;

    var margins = {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Create container
    var chartElement = containerElement.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    // Draw here!
    var scaleFactor = 30;
    var row = 0;
    var colPos = 0;
    chartElement.append('g')
        .attr('class', 'boxes total')
        .selectAll('rect')
        .data(config['data'])
        .enter()
            .append('rect')
            .attr('class', function(d) {
                return classify(d['usps']);
            })
            .attr('width', function(d) {
                return Math.floor(Math.sqrt(d['total_dels'] * scaleFactor));
            })
            .attr('height', function(d) {
                return Math.floor(Math.sqrt(d['total_dels'] * scaleFactor));
            })
            .attr('x', function(d,i) {
                if (i % 10 == 0 && i != 0) {
                    colPos = 0;
                }
                var newPos = colPos + 10;
                colPos = newPos + Math.sqrt(d['total_dels'] * scaleFactor);
                return newPos;
            })
            .attr('y', function(d,i) {
                if (i % 10 == 0 && i != 0) {
                    row++;
                }
                return row * 70;
            });

    chartElement.append('g')
        .attr('class', 'state-labels')
        .selectAll('text')
        .data(config['data'])
        .enter()
            .append('text')
            .text(function(d){
                return d['usps'];
            })
            .attr('class', function(d) {
                return classify(d['usps']);
            })
            .attr('x', function(d,i) {
                var box = d3.select('.boxes.total .' + classify(d['usps']));
                var boxX = Number(box.attr('x'));
                return boxX;
            })
            .attr('y', function(d,i) {
                var box = d3.select('.boxes.total .' + classify(d['usps']));
                var boxY = Number(box.attr('y'));
                return boxY + 10;
            })
            .attr('dx', 3)
            .attr('dy', 3);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
