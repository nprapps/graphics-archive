// Global vars
var DATA_URL = '//elections.npr.org/data/delegates.json';
var JUMBO_THRESHOLD = 800;
var MAX_WIDTH = 730;
var MAP_MAX_WIDTH = 1000;
var pymChild = null;
var delegateData = [];
var overallData = [];
var stateData = [];
var parties = [];
var states = null;
var isJumbo = false;
var isMobile = false;
var isMapRendered = false;
var inactiveColorScale = [ '#787878', '#aaa', '#f1f1f1' ];

var gopTab = null;
var demTab = null;

var candidateFull = [];
candidateFull['Carson'] = 'Ben Carson';
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
            ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });
    }
}

/*
 * Load data from a CSV
 */
var loadData = function(url) {
    d3.json(url, function(error, data) {
        overallData = data['nation'];
        stateData = data;
        parties = d3.keys(overallData);
        states = d3.keys(stateData);

        formatData(data);

        renderTable({
            container: '.detail.gop',
            data: stateData,
            party: 'gop'
        });

        renderTable({
            container: '.detail.dem',
            data: stateData,
            party: 'dem'
        });

        lastUpdated = data['last_updated'];
        var source = d3.select('.footer .as-of');
        var sourceText = ' (as of ' + lastUpdated + ' EDT)';
        source.text(sourceText);

        pymChild = new pym.Child({
            renderCallback: render
        });

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA_DEM.forEach(function(d) {
        d['total_dels'] = +d['total_dels'];
    });
    DATA_GOP.forEach(function(d) {
        d['total_dels'] = +d['total_dels'];
    });

    // Loop through overall totals (nested as party, then candidate)
    parties.forEach(function(p,i) {
        overallData[p].forEach(function(d) {
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
        });

        overallData[p] = _.sortBy(overallData[p], 'delegates_count');
        overallData[p].reverse();
    });

    // Loop through state data (nested as state -> party -> candidate)
    states.forEach(function(s, sk) {
        parties.forEach(function(p, pk) {
            if (typeof stateData[s][p] != 'undefined') {
                stateData[s][p].forEach(function(d, i) {
                    d['delegates_count'] = +d['delegates_count'];
                    d['superdelegates_count'] = +d['superdelegates_count'];
                    d['pledged_delegates_count'] = d['delegates_count'] - d['superdelegates_count'];

                    delete d['candidateid'];
                    delete d['d1'];
                    // delete d['d7'];
                    delete d['d30'];
                    delete d['id'];
                    // delete d['party_need'];
                    delete d['party_total'];
                });

                stateData[s][p] = stateData[s][p].filter(function(d) {
                    return d['last'] != 'Carson' && d['last'] != 'Bush' && d['last'] != 'Paul' && d['last'] != 'Huckabee' && d['last'] != 'Fiorina' && d['last'] != 'Gilmore' && d['last'] != 'Christie';
                });
            }
        });
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var barChartWidth = containerWidth;
    if (barChartWidth > MAX_WIDTH) {
        barChartWidth = MAX_WIDTH;
    }

    var mapWidth = containerWidth;
    if (mapWidth > MAP_MAX_WIDTH) {
        mapWidth = MAP_MAX_WIDTH;
    }
    var gutterWidth = 33;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        isJumbo = false;
        mapWidth = mapWidth;
    } else if (containerWidth >= JUMBO_THRESHOLD) {
        isMobile = false;
        isJumbo = true;
        mapWidth = Math.floor((mapWidth - gutterWidth) / 2);
    } else {
        isMobile = false;
        isJumbo = false;
        mapWidth = Math.floor((mapWidth - gutterWidth) / 2);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#stacked-bar-chart');

    parties.forEach(function(p, i) {
        // Render the chart!
        renderStackedBarChart({
            container: '.chart.' + p + ' .wrapper',
            width: barChartWidth,
            data: overallData[p],
            party: p
        });

        // Render the map!
        if (!isMapRendered) {
            var partyContainer = d3.select('.map.' + p + ' .wrapper')
            partyContainer.html('');

            var candidates = _.pluck(stateData['nation'][p], 'last');
            candidates.forEach(function(d, i) {
                var mapContainer = partyContainer.append('div')
                    .attr('class', 'map')
                    .attr('id', 'map-' + classify(d))
                    .attr('style', function() {
                        if (!isMobile) {
                            return 'width: ' + mapWidth + 'px;';
                        }
                    });

                var partyData = eval('DATA_' + p.toUpperCase());

                renderMap({
                    container: '#map-' + classify(d),
                    map: '#' + p + '-map',
                    party: classify(p),
                    candidate: d,
                    data: partyData
                });
            });
        }
        // just resize the containing div
        var maps = d3.selectAll('.map.' + p)
            .attr('style', 'max-width: ' + MAP_MAX_WIDTH + 'px;');

        var maps = d3.selectAll('.map.' + p + ' .wrapper .map')
            .attr('style', function() {
                if (!isMobile) {
                    return 'width: ' + mapWidth + 'px;';
                }
            });
        maps.selectAll('svg')
            .attr('width', mapWidth)
            .attr('height', function() {
                var s = d3.select(this);
                var viewBox = s.attr('viewBox').split(' ');
                return Math.floor(mapWidth * viewBox[3] / viewBox[2]);
            });
    });
    isMapRendered = true;

    gopTab = d3.select('.tabs .gop')
    demTab = d3.select('.tabs .dem')

    demTab.on('click', function() {
        demTab.classed('active', true);
        gopTab.classed('active', false);
        d3.select('.chart.dem').style('display', 'block');
        d3.select('.map.dem').style('display', 'block');
        d3.select('.detail.dem').style('display', 'block');
        d3.select('.chart.gop').style('display', 'none');
        d3.select('.map.gop').style('display', 'none');
        d3.select('.detail.gop').style('display', 'none');
        d3.select('.footnotes.gop').style('display', 'none');

        if (pymChild) {
            pymChild.sendHeight();
        }
    });

    gopTab.on('click', function() {
        demTab.classed('active', false);
        gopTab.classed('active', true);
        d3.select('.chart.dem').style('display', 'none');
        d3.select('.map.dem').style('display', 'none');
        d3.select('.detail.dem').style('display', 'none');
        d3.select('.chart.gop').style('display', 'block');
        d3.select('.map.gop').style('display', 'block');
        d3.select('.detail.gop').style('display', 'block');
        d3.select('.footnotes.gop').style('display', 'block');

        if (pymChild) {
            pymChild.sendHeight();
        }
    });

    // gopTab.on('click')();
    demTab.on('click')();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'last';

    // console.table(config['data']);
    config['data'] = config['data'].filter(function(d) {
        // console.log(d['last'], d['delegates_count'], '+' + d['d1']);
        return d['last'] != 'Carson' && d['last'] != 'Christie' && d['last'] != 'Bush' && d['last'] != 'Fiorina' && d['last'] != 'Paul' && d['last'] != 'Gilmore' && d['last'] != 'Huckabee';
    });

    var barHeight = 50;
    var barGap = 2;
    var labelWidth = 120;
    var labelMargin = 11;
    var valueGap = 6;
    var ticksX = 4;
    var delsRequired = config['data'][0]['party_need'];

    if (isMobile) {
        barHeight = 40;
        labelWidth = 45;
        ticksX = 2;
    }

    var rightMargin = Math.floor(config['width'] * 0.5);
    var cols = null;

    switch(config['party']) {
        case 'dem':
            cols = 3;
            break;
        case 'gop':
            cols = 2;
            break;
    }
    var valueWidth = Math.floor(rightMargin / cols);

    var margins = {
        top: 0,
        right: (rightMargin + barGap),
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Cache reference to container element
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var min = 0;
    var max = d3.max(config['data'], function(d) {
        return d['delegates_count'] + 25;
    });
    if (max < delsRequired) {
        max = delsRequired;
    }

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

    var colorScale = d3.scale.ordinal()
        .domain([ 'Pledged delegates', 'Superdelegates' ]);

    switch(config['party']){
        case 'dem':
            colorScale.range([ COLORS['blue2'], COLORS['blue4'], '#f1f1f1' ]);
            break;
        case 'gop':
            colorScale.range([ COLORS['red2'], COLORS['red4'], '#f1f1f1' ]);
            break;
    }

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

    // define filters
    var grayFilter = chartElement.append('filter')
        .attr('id', 'grayscale');
    grayFilter.append('feColorMatrix')
        .attr('type', 'matrix')
        .attr('values', '1   0   0   0   0   1   0   0   0   0   1   0   0   0   0   0   0   0   1   0');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues([ xScale.domain()[0], delsRequired ])
        // .tickValues([ xScale.domain()[0], xScale.domain()[1] ])
        .tickFormat(function(d, i) {
            if (i == 1) {
                return 'Needed: ' + fmtComma(d);
            } else {
                return fmtComma(d);
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    // right-align instead of center-align the last one
    chartElement.selectAll('.tick text')
        .style('text-anchor', function(d,i) {
            if (i == 0) {
                return 'begin';
            }
            if (i == 1) {
                return 'end';
            }
        })
        .attr('dx', function(d,i) {
            if (i == 0) {
                return 2;
            }
            if (i == 1) {
                return 1;
            }
        });

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
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d[labelColumn]);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

    group.append('rect')
        .attr('fill', '#f1f1f1')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', chartWidth)
        .attr('height', barHeight);

     group.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }
                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .style('fill', function(d, i) {
                var g = d3.select(this.parentNode.parentNode);
                if (g.classed('cruz') || g.classed('rubio') || g.classed('kasich')) {
                    return inactiveColorScale[i];
                } else {
                    return colorScale(d['name']);
                }
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

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
                    var last = d[labelColumn];
                    return candidateFull[last];
                });

    /*
     * Pull out key numbers
     */
    var keyNums = chartWrapper.append('div')
        .attr('class', 'key-numbers')
        .attr('style', function() {
            var s = '';
            s += 'height: ' + (chartHeight + margins['bottom']) + 'px;';
            s += 'width: ' + (margins['right'] - barGap) + 'px;';
            s += 'left: ' + (margins['left'] + chartWidth + barGap) + 'px;';
            s += 'top: ' + margins['top'] + 'px;';
            return s;
        });

    // headers
    keyNums.append('h5')
        .attr('style', function() {
            var s = '';
            s += 'width: ' + valueWidth + 'px; ';
            s += 'bottom: ' + (chartHeight + margins['bottom'] + 10) + 'px; ';
            s += 'left: 0px;';
            return s;
        })
        .attr('class', 'total')
        .text('Total');

    if (config['party'] == 'dem') {
        keyNums.append('h5')
            .attr('style', function() {
                var s = '';
                s += 'width: ' + valueWidth + 'px; ';
                s += 'bottom: ' + (chartHeight + margins['bottom'] + 10) + 'px; ';
                s += 'left: ' + valueWidth + 'px;';
                return s;
            })
            .html('Pledged +<br />Super-<br />delegates');
    }

    keyNums.append('h5')
        .attr('style', function() {
            var s = '';
            s += 'width: ' + valueWidth + 'px; ';
            s += 'bottom: ' + (chartHeight + margins['bottom'] + 10) + 'px; ';
            s += 'left: ' + (valueWidth * (cols - 1)) + 'px;';
            return s;
        })
        .html('Last 7 days');

    // values
    config['data'].forEach(function(d, i) {
        var topPos = i * (barHeight + barGap);

        keyNums.append('div')
            .attr('class', 'stat total')
            .attr('style', function() {
                var s = '';
                s += 'left: 0;';
                s += 'top: ' + topPos + 'px;';
                s += 'height: ' + barHeight + 'px;';
                s += 'width: ' + valueWidth + 'px;';
                return s;
            })
            .append('span')
                .text(fmtComma(d['delegates_count']));

        if (config['party'] == 'dem') {
            keyNums.append('text')
                .attr('class', 'stat pledged')
                .attr('style', function() {
                    var s = '';
                    s += 'left: ' + valueWidth + 'px;';
                    s += 'top: ' + topPos + 'px;';
                    s += 'height: ' + barHeight + 'px;';
                    s += 'width: ' + valueWidth + 'px;';
                    return s;
                })
                .append('span')
                    .html('<b class="pledged">' + fmtComma(d['pledged_delegates_count']) + '</b> + <b class="super">' + fmtComma(d['superdelegates_count']) + '</b>');
        }

        keyNums.append('div')
            .attr('class', 'stat d7')
            .attr('style', function() {
                var s = '';
                s += 'left: ' + (valueWidth * (cols - 1)) + 'px;';
                s += 'top: ' + topPos + 'px;';
                s += 'height: ' + barHeight + 'px;';
                s += 'width: ' + valueWidth + 'px;';
                return s;
            })
            .append('span')
                .text(function() {
                    var val = fmtComma(d['d7']);
                    if (d['d7'] < 0) {
                        val = val;
                    } else if (d['d7'] > 0) {
                        val = '+' + val;
                    }
                    return val;
                });
    });

    // delegates needed line
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');
    annotations.append('line')
        .attr('x1', xScale(delsRequired))
        .attr('x2', xScale(delsRequired))
        .attr('y1', -5)
        .attr('y2', chartHeight);
}

/*
 * Detailed delegate data table
 */
var renderTable = function(config) {
    var party = config['party'];

    var candidateList = CANDIDATES.filter(function(d) {
        return d.party == config['party'];
    });
    candidateList = _.pluck(candidateList, 'name');

    var stateList = [];
    switch(party) {
        case 'dem':
            stateList = DEM_DATES;
            break;
        case 'gop':
            stateList = GOP_DATES;
            break;
    }
    stateList = _.pluck(stateList, 'usps');

    var dataTable = d3.select(config['container'] + ' table');
    var dataRows = dataTable.select('tbody').selectAll('tr');

    dataRows[0].forEach(function(d, i) {
        var row = d3.select(d);
        var s = row.attr('class');
        var sData = config['data'][s][party];
        var sUnassigned = row.select('td.unassigned');
        var sDels = Number(sUnassigned.text());
        if (party == 'dem') {
            var sUnassignedPledged = row.select('td.unassigned.pledged');
            var sDelsPledged = +sUnassignedPledged.select('b.pledged').text();
            var sDelsSuper = +sUnassignedPledged.select('b.super').text();
        }

        sData.forEach(function(v, k) {
            var cDels = Number(v['delegates_count']);
            var cDelsFloor = Math.floor(cDels / 10) * 10;

            if (party == 'dem') {
                var cDelsPledged = +v['delegates_count'] - +v['superdelegates_count'];
                var cDelsSuper = +v['superdelegates_count'];
            }

            var cCell = row.selectAll('td.' + classify(v['last']))
                .html(function(a,b) {
                    if (b == 0) {
                        return cDels;
                    } else if (b == 1) {
                        return '<b class="pledged">' + cDelsPledged + '</b> + <b class="super">' + cDelsSuper + '</b>';
                    }
                });

            if (cDels > 0) {
                cCell.classed('has-dels', true);
                cCell.classed('bg-' + cDelsFloor, true);
            }

            sDels -= cDels;

            if (party == 'dem') {
                sDelsPledged -= cDelsPledged;
                sDelsSuper -= cDelsSuper;
            }
        });

        sUnassigned.text(sDels);
        if (sDels > 0) {
            sUnassigned.classed('has-dels', true);
        }

        if (party == 'dem') {
            sUnassignedPledged.select('b.pledged')
                .text(sDelsPledged);
            sUnassignedPledged.select('b.super')
                .text(sDelsSuper);
        }
    });
}


/*
 * Render delegate maps
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

    var totalData = stateData['nation'][config['party']].filter(function(v,k) {
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

        var stateDelegateData = stateData[s][config['party']].filter(function(v,k) {
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

        // if (config['party'] == 'dem') {
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
        // }

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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
