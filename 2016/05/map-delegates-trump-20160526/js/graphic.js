// Global vars
var DATA_URL = 'delegates.json';
var JUMBO_THRESHOLD = 800;
var pymChild = null;
var isMobile = false;
var isJumbo = false;
var parties = [];
var lastUpdated = '';
var delegateData = [];
var overallData = [];

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
    DATA_GOP.forEach(function(d) {
        d['total_dels'] = +d['total_dels'];
    });

    // Loop through overall totals (nested as party, then candidate)
    parties.forEach(function(p,i) {
        overallData[p] = [];

        delegateData['nation'][p].forEach(function(d) {
            d['delegates_count'] = +d['delegates_count'];
            d['superdelegates_count'] = +d['superdelegates_count'];
            d['pledged_delegates_count'] = d['delegates_count'] - d['superdelegates_count'];
            d['party_need'] = +d['party_need'];

            d['values'] = [];
            d['values'].push({
                'name': 'Pledged delegates',
                'x0': 0,
                'x1': d['pledged_delegates_count'],
                'val': d['pledged_delegates_count']
            });
            d['values'].push({
                'name': 'Superdelegates',
                'x0': d['pledged_delegates_count'],
                'x1': (d['pledged_delegates_count'] + d['superdelegates_count']),
                'val': d['superdelegates_count']
            });
            d['values'].push({
                'name': 'Remaining',
                'x0': (d['pledged_delegates_count'] + d['superdelegates_count']),
                'x1': d['party_need'],
                'val': (d['party_need'] - d['delegates_count'])
            });

            if (d['last'] == 'Trump' || d['last'] == 'Cruz' || d['last'] == 'Rubio' || d['last'] == 'Kasich') {
                overallData[p].push( {
                    'delegates_count': d['delegates_count'],
                    'last': d['last']
                })
            }
        });

        overallData[p] = _.sortBy(overallData[p], 'delegates_count');
        overallData[p].reverse();
    });

    // Loop through state data (nested as state -> party -> candidate)
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
                    return d['last'] == 'Trump';
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

    var p = 'gop';
    graphicWidth = containerWidth;

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

    // Render the chart!
    renderBarChart({
        container: '#bar-chart',
        width: containerWidth,
        data: overallData[p]
    });

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
    // d3.select(config['container']).append('h4')
    //     .html(function() {
    //         if (config['candidate'] == 'Sanders') {
    //             return candidateFull[config['candidate']] + '&rsquo; Delegate Wins';
    //         } else {
    //             return candidateFull[config['candidate']] + '&rsquo;s Delegate Wins';
    //         }
    //     });

    var totalData = delegateData['nation'][config['party']].filter(function(v,k) {
        return v['last'] == config['candidate'];
    });
    var total_dels = totalData[0].delegates_count;
    var pledged_delegates_count = totalData[0].pledged_delegates_count;
    var superdelegates_count = totalData[0].superdelegates_count;

    // d3.select(config['container'])
    //     .append('h5')
    //     .html('<span class="delegates">' + fmtComma(total_dels) + ' delegates</span>');

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


/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    // console.log(config['data']);

    /*
     * Setup
     */
    var labelColumn = 'last';
    var valueColumn = 'delegates_count';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 45;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 20,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 500;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    })

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return fmtComma(d.toFixed(0));
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
            });

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'width': labelWidth + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap)) + 'px;'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
                });

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d) {
                return fmtComma(d[valueColumn].toFixed(0));
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()

                // Negative case
                if (d[valueColumn] < 0) {
                    var outsideOffset = -(valueGap + textWidth);

                    if (xStart + outsideOffset < 0) {
                        d3.select(this).classed('in', true)
                        return valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return outsideOffset;
                    }
                // Positive case
                } else {
                    if (xStart + valueGap + textWidth > chartWidth) {
                        d3.select(this).classed('in', true)
                        return -(valueGap + textWidth);
                    } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    }
                }
            })
            .attr('dy', (barHeight / 2) + 3);

    var annotations = chartElement.append('g')
        .attr('class', 'annotations');
    annotations.append('line')
        .attr('x1', xScale(1237))
        .attr('x2', xScale(1237))
        .attr('y1', -5)
        .attr('y2', chartHeight);
    annotations.append('text')
        .text('1,237 needed')
        .attr('x', xScale(1237))
        .attr('y', 0)
        .attr('dy', -10);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
