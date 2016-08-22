// Global vars
var DATA_URL = '//elections.npr.org/data/delegates.json';
var pymChild = null;
var overallData = [];
var parties = [];
var isMobile = false;

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
        parties = d3.keys(overallData);

        formatData(data);

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
}

/*
 * Render the graphic(s). Called by pym with the container width.
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

    parties.forEach(function(p, i) {
        // Render the chart!
        renderStackedBarChart({
            container: '.chart.' + p + ' .wrapper',
            width: containerWidth,
            data: overallData[p],
            party: p
        });
    });

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

    var barHeight = 40;
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
    var inactiveColorScale = d3.scale.ordinal()
        .domain([ 'Pledged delegates', 'Superdelegates' ])
        .range([ '#787878', '#aaa', '#f1f1f1' ]);

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
                    return inactiveColorScale(d['name']);
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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
