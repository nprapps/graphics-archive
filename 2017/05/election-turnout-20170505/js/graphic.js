// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['label'] = d3.time.format('%Y').parse(d['label']);
        d['amt'] = +d['amt'];
    });
    DIFF.forEach(function(d) {
        d['label'] = d3.time.format('%Y').parse(d['label']);
        d['amt'] = +d['amt'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#column-chart');
    containerElement.html('');

    var turnoutChart = containerElement.append('div')
        .attr('class', 'chart turnout');

    turnoutChart.append('h3')
        .html(LABELS['hed_turnout']);

    // Render the chart!
    renderColumnChart({
        container: '.chart.turnout',
        width: graphicWidth,
        data: DATA,
        unitSuffix: '%',
        yDomain: [ 0, 80 ],
        id: 'turnout'
    });

    var diffChart = containerElement.append('div')
        .attr('class', 'chart difference');

    diffChart.append('h3')
        .html(LABELS['hed_difference']);

    // Render the chart!
    renderColumnChart({
        container: '.chart.difference',
        width: graphicWidth,
        data: DIFF,
        unitSuffix: '%',
        yDomain: [ -40, 0 ],
        id: 'difference'
    });

    if (!isMobile) {
        containerElement.selectAll('.chart')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (i > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 16 : 4;
    var aspectHeight = isMobile ? 9 : 3;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 37
    };

    var ticksY = 4;
    var roundTicksFactor = 20;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

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
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var min = config['yDomain'][0];
    var max = config['yDomain'][1];

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if ((config['id'] == 'turnout' && i % 2 == 0) || config['id'] == 'difference') {
                return '\u2019' + fmtYearAbbrev(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (config['unitSuffix']) {
                return d + config['unitSuffix'];
            } else {
                return d;
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
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
                return xScale(d[labelColumn]);
            })
            .attr('y', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(0);
                }

                return yScale(d[valueColumn]);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(d[valueColumn]) - yScale(0);
                }

                return yScale(0) - yScale(d[valueColumn]);
            })
            .attr('class', function(d) {
                var c = 'bar bar-' + d[labelColumn];
                if (d['type']) {
                    c += ' ' + classify(d['type']);
                }
                return c;
            });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    /*
     * Render bar values.
     */
    if (config['id'] == 'difference') {
        chartElement.append('g')
            .attr('class', 'value')
            .selectAll('text')
            .data(config['data'])
            .enter()
            .append('text')
                .text(function(d) {
                    return d[valueColumn].toFixed(0);
                })
                .attr('x', function(d, i) {
                    return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
                })
                .attr('y', function(d) {
                    return yScale(d[valueColumn]);
                })
                .attr('dy', function(d) {
                    var textHeight = d3.select(this).node().getBBox().height;
                    var barHeight = 0;

                    if (d[valueColumn] < 0) {
                        barHeight = yScale(d[valueColumn]) - yScale(0);

                        if (textHeight + valueGap * 2 < barHeight) {
                            d3.select(this).classed('in', true);
                            return -(textHeight - valueGap / 2);
                        } else {
                            d3.select(this).classed('out', true)
                            return textHeight + valueGap;
                        }
                    } else {
                        barHeight = yScale(0) - yScale(d[valueColumn]);

                        if (textHeight + valueGap * 2 < barHeight) {
                            d3.select(this).classed('in', true)
                            return textHeight + valueGap;
                        } else {
                            d3.select(this).classed('out', true)
                            return -(textHeight - valueGap / 2);
                        }
                    }
                })
                .attr('text-anchor', 'middle');
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
