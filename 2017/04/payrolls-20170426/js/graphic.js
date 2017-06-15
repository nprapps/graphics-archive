// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var tickValues = [];

/*
 * Initialize graphic
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
        d['amt'] = +d['amt'];
        d['year'] = +d['year'];
        d['month'] = +d['month'];

        if (d['month'] == 1) {
            tickValues.push(d['label']);
        }
    });

    /*
    DATA.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    // Restructure tabular data for easier charting.
    for (var column in DATA[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': DATA.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
    // filter out empty data. uncomment this if you have inconsistent data.
    //        }).filter(function(d) {
    //            return d['amt'] != null;
            })
        });
    }
    */
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

    // Render the chart!
    renderColumnChart({
        container: '#column-chart',
        width: containerWidth,
        data: DATA
    });

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

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 7;
    var valueGap = 6;
    var annotYOffset = 8;
    var labelLineHeight = 13;

    var margins = {
        top: 5,
        right: 85,
        bottom: 20,
        left: 55
    };

    var ticksY = 4;
    var roundTicksFactor = 100;

    if (isMobile) {
        margins['left'] = 40;
        margins['right'] = 70;
        labelLineHeight = 11;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

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
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(tickValues)
        .tickFormat(function(d, i) {
            return '';
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            } else if (!isMobile) {
                return '+' + fmtComma(d) + ',000';
            } else if (isMobile) {
                return '+' + d + 'k';
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

        chartElement.selectAll('.x.axis .tick line')
            .attr('x1', function(d) {
                var xPos = -xScale.rangeBand() / 2;
                return xPos;
            })
            .attr('x2', function(d) {
                var xPos = -xScale.rangeBand() / 2;
                return xPos;
            });

    var yearLabels = chartElement.append('g')
        .attr('class', 'years');
    yearLabels.selectAll('text')
        .data(config['data'].filter(function(d) {
            return d['month'] == 6;
        }))
        .enter()
            .append('text')
            .text(function(d) {
                return d['year'];
            })
            .attr('x', function(d) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', chartHeight + 15);
    yearLabels.append('text')
        .text('2017')
        .attr('x', function() {
            return xScale('1/2017') + (xScale.rangeBand() / 2);
        })
        .attr('y', chartHeight + 15)
        .attr('class', 'y-2017');

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
                return 'bar y-' + d['year'];
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
    // chartElement.append('g')
    //     .attr('class', 'value')
    //     .selectAll('text')
    //     .data(config['data'])
    //     .enter()
    //     .append('text')
    //         .text(function(d) {
    //             return d[valueColumn].toFixed(0);
    //         })
    //         .attr('x', function(d, i) {
    //             return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
    //         })
    //         .attr('y', function(d) {
    //             return yScale(d[valueColumn]);
    //         })
    //         .attr('dy', function(d) {
    //             var textHeight = d3.select(this).node().getBBox().height;
    //             var barHeight = 0;
    //
    //             if (d[valueColumn] < 0) {
    //                 barHeight = yScale(d[valueColumn]) - yScale(0);
    //
    //                 if (textHeight + valueGap * 2 < barHeight) {
    //                     d3.select(this).classed('in', true);
    //                     return -(textHeight - valueGap / 2);
    //                 } else {
    //                     d3.select(this).classed('out', true)
    //                     return textHeight + valueGap;
    //                 }
    //             } else {
    //                 barHeight = yScale(0) - yScale(d[valueColumn]);
    //
    //                 if (textHeight + valueGap * 2 < barHeight) {
    //                     d3.select(this).classed('in', true)
    //                     return textHeight + valueGap;
    //                 } else {
    //                     d3.select(this).classed('out', true)
    //                     return -(textHeight - valueGap / 2);
    //                 }
    //             }
    //         })
    //         .attr('text-anchor', 'middle')

    // annotations
    var lastBar = config['data'][config['data'].length - 1];
    var lastBarLabel = 'March 2017: +' + fmtComma(lastBar[valueColumn]) + ',000 jobs';
    if (isMobile) {
        lastBarLabel = 'March 2017: +' + fmtComma(lastBar[valueColumn]) + 'k jobs';
    }
    var annot = chartElement.append('g')
        .attr('class', 'annotations');
    annot.append('line')
        .attr('x1', xScale(lastBar[labelColumn]) + xScale.rangeBand())
        .attr('x2', chartWidth + 6)
        .attr('y1', yScale(lastBar[valueColumn]) + 5)
        .attr('y2', yScale(lastBar[valueColumn]) + 5);
    annot.append('text')
        .text(lastBarLabel)
        .attr('x', chartWidth + 12)
        .attr('y', yScale(lastBar[valueColumn]) + annotYOffset)
        .call(wrapText, margins['right'] - 12, labelLineHeight);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
