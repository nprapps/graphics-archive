// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

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
        d['date'] = d3.time.format('%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
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
            })
        });
    }
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
    var numCols = null;
    var labelWidth = 30;
    var labelGap = 6;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 2;
        labelWidth = 5;
    } else {
        isMobile = false;
        numCols = 3;
    }

    var containerElement = d3.select('#chart-wrapper');
    containerElement.html('');

    // Render the chart!
    dataSeries.forEach(function(d, i) {
        var thisChartSlug = classify(d['name']);
        graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1)) - 10) / numCols);
        var showLabels = false;
        if (i % numCols == 0) {
            graphicWidth += labelWidth + labelGap;
            showLabels = true;
        }

        var thisChart = containerElement.append('div')
            .attr('id', 'chart-' + thisChartSlug)
            .attr('class', 'chart chart-' + i)
            .attr('style', 'width: ' + graphicWidth + 'px;');

        renderLineChart({
            container: '#chart-' + thisChartSlug,
            width: graphicWidth,
            showLabels: showLabels,
            data: [d]
        })
    })

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 80,
        bottom: 20,
        left: 40
    };

    if (!config['showLabels']) {
        margins['left'] = 0;
    }

    var ticksX = 6;
    var ticksY = 3;
    var roundTicksFactor = 5;

    var formatComma = d3.format(',');

    // Mobile
    if (isMobile) {
        ticksX = 6;
        ticksY = 3;
        margins['right'] = 40;
        margins['top'] = 10;
    }

    if (isMobile && config['showLabels']) {
        margins['left'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = null;

    if (isMobile) {
        chartHeight = 102;
        // chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    } else {
        chartHeight = 124;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3').text(config['data'][0]['name']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ]);

    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var yScale = d3.scale.linear()
        .domain([min, 6000])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

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
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (config['showLabels']) {
                if (chartWidth < 110) {
                    if (i % 2) {
                        return '\u2019' + fmtYearAbbrev(d);
                    }
                } else {
                    if (i % 2) {
                        return fmtYearFull(d);
                    }
                }
            } else {
                if (chartWidth < 114) {
                    if (i % 2) {
                        return '\u2019' + fmtYearAbbrev(d);
                    }
                } else {
                    if (i % 2) {
                        return fmtYearFull(d);
                    }
                }
            }

        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return (d/1000) + 'K';
            } else {
                return formatComma(d);
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    if (config['showLabels']) {
        chartElement.append('g')
            .attr('class', 'y axis')
            .call(yAxis);
    }

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

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
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(config['data'])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return '#666';
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    var chartLabels = chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter();
    chartLabels.append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];
                var label = last[valueColumn].toFixed(0);

                var firstVal = d['values'][0]['amt'];
                var lastVal = d['values'][d['values'].length - 1]['amt'];
                var changeVal = Math.floor(((lastVal - firstVal) / firstVal) * 100);
                var percChange = null;

                if (changeVal < 0) {
                    percChange = changeVal;
                } else {
                    percChange = '+' + changeVal;
                }

                // return formatComma(label) + ' (' + percChange + '%)';
                return formatComma(label);
            });

    chartLabels.append('text')
        .attr('x', function(d, i) {
            var last = d['values'][d['values'].length - 1];

            return xScale(last[dateColumn]) + 5;
        })
        .attr('y', function(d) {
            var last = d['values'][d['values'].length - 1];

            return yScale(last[valueColumn]) + 16;
        })
        .attr('class', function(d) {
            var firstVal = d['values'][0]['amt'];
            var lastVal = d['values'][d['values'].length - 1]['amt'];
            var changeVal = Math.floor(((lastVal - firstVal) / firstVal) * 100);
            var labelColor = null;

            if (changeVal < 0) {
                labelColor = 'negative';
            } else {
                labelColor = 'positive';
            }

            return labelColor;
        })
        .text(function(d) {
            var firstVal = d['values'][0]['amt'];
            var lastVal = d['values'][d['values'].length - 1]['amt'];
            var changeVal = Math.floor(((lastVal - firstVal) / firstVal) * 100);
            var percChange = null;

            if (changeVal < 0) {
                percChange = changeVal;
            } else {
                percChange = '+' + changeVal;
            }

            return '(' + percChange + '%)';
        });

    // if (isMobile) {
    //     chartLabels.call(wrapText, 30, 13);
    // }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
