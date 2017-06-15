// Global vars
var pymChild = null;
var isMobile = false;
var percDataSeries = [];
var numDataSeries = [];

var projected_dates = [
    { 'begin': '2017-01-01', 'end': '2027-01-01' }
];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData(PERC_DATA, percDataSeries);
        formatData(NUM_DATA, numDataSeries);

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
var formatData = function(data, dataSeries) {
    data.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in data[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': data.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
            // filter out empty data. uncomment this if you have inconsistent data.
            }).filter(function(d) {
                return d['amt'] != null;
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
    var gutterWidth = 11;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    var containerElement = d3.select('#chart-wrapper');
    containerElement.html('');

    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'perc-chart')
        .attr('style', 'width: ' + graphicWidth + 'px;');
    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'num-chart')
        .attr('style', 'width: ' + graphicWidth + 'px;');

    // Render the chart!
    renderLineChart({
        container: '#perc-chart',
        width: graphicWidth,
        data: percDataSeries,
        chartHead: LABELS['perc_headline']
    });
    renderLineChart({
        container: '#num-chart',
        width: graphicWidth,
        data: numDataSeries,
        chartHead:  LABELS['num_headline']
    });

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
    var labelLineHeight = 12;

    var aspectWidth = isMobile ? 1 : 1;
    var aspectHeight = isMobile ? 1 : 1;

    var margins = {
        top: 25,
        right: 40,
        bottom: 20,
        left: 38
    };

    var ticksX = 5;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 35;
        // margins['top'] = 15;
        labelLineHeight = 11;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['chartHead']);

    // containerElement.append('h5')
    //     .text('Projected');

    var lastDateValue = config['data'][1]['values'].length - 1;
    var lastValue = config['data'][0]['values'].length - 1;
    var valuesShown = [
        config['data'][0]['values'][lastValue],
        config['data'][1]['values'][lastDateValue]
    ];

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain([
            config['data'][0]['values'][0]['date'], config['data'][1]['values'][lastDateValue]['date']
        ])
        .range([ 0, chartWidth ])

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

    if (config['container'] == '#perc-chart') {
        var yScale = d3.scale.linear()
            .domain([min, 100])
            .range([chartHeight, 0]);
    } else {
        if (isMobile) {
            var yScale = d3.scale.linear()
                .domain([min, 25])
                .range([chartHeight, 0]);
        } else {
            var yScale = d3.scale.linear()
                .domain([min, 26])
                .range([chartHeight, 0]);
        }
    }

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['teal3']]);

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
        .tickFormat(function(d) {
            return '\u2019' + fmtYearAbbrev(d);
        });

    if (config['container'] == '#perc-chart') {
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left')
            .ticks(ticksY)
            .tickFormat(function(d) {
                if (d == 0) {
                    return d;
                } else {
                    return d + '%';
                }
            });
    } else {
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left')
            .ticks(ticksY)
            .tickFormat(function(d) {
                if (d == 0) {
                    return d;
                } else if (d == 26) {
                    return '$' + d + 'T';
                } else {
                    return '$' + d;
                }
            });
    }

    var projection = chartElement.append('g')
        .attr('class', 'projection')
        .selectAll('rect')
        .data(projected_dates)
        .enter()
            .append('rect')
                .attr('x', xScale(d3.time.format('%Y-%m-%d').parse('2016-12-31')))
                .attr('width', function(d) {
                    var start = xScale(d3.time.format('%Y-%m-%d').parse('2016-12-31'));
                    var end = xScale(d3.time.format('%Y-%m').parse('2027-01'));
                    return end - start;
                })
                .attr('y', 0)
                .attr('height', chartHeight)
                .attr('fill', '#ebebeb');

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

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
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return line(d['values']);
            })
            .attr('stroke-dasharray', function(d) {
                if (d['name'] == 'projected') {
                    return '4px 2px';
                }
                else {
                    return 0;
                }
            });

    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('text')
        .data(valuesShown)
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['date']);
            })
            .attr('cy', function(d) {
                return yScale(d['amt']);
            })
            .attr('fill', function(d) {
                return COLORS['teal2'];
            })
            .attr('stroke', 'white')
            .attr('r', 3.25);

    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('text')
        .data(valuesShown)
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['date']);
            })
            .attr('cy', function(d) {
                return yScale(d['amt']);
            })
            .attr('fill', function(d) {
                return COLORS['teal2'];
            })
            .attr('stroke', 'white')
            .attr('r', 3.25);

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];
                var lastVal = last['amt'];
                switch (lastVal) {
                    case 76.52244:
                        return xScale(last[dateColumn]) + 7;
                        break;
                    case 14.838:
                        return xScale(last[dateColumn]) + 8;
                        break;
                    default:
                        return xScale(last[dateColumn]) + 8;
                }
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];
                var lastVal = last['amt'];
                switch (lastVal) {
                    case 76.52244:
                        return yScale(last[valueColumn]) + 2;
                        break;
                    case 14.838:
                        return yScale(last[valueColumn]) + 8;
                        break;
                    default:
                        return yScale(last[valueColumn]);
                }

                // return yScale(last[valueColumn]);
            })
            .text(function(d) {
                // if (d['name'] == 'projected') {
                    var last = d['values'][d['values'].length - 1];
                    var value = last[valueColumn];
                    console.log(value);

                    if (config['container'] == '#perc-chart') {
                        if (value < 80) {
                            var label = 'Current: ' + last[valueColumn].toFixed(0) + '%';
                        } else {
                            var label = last[valueColumn].toFixed(0) + '%';
                        }
                    } else {
                        if (value < 20) {
                            var label = '2016: $' + last[valueColumn].toFixed(1) + ' trillion';
                        } else {
                            var label = '$' + last[valueColumn].toFixed(1) + ' trillion';
                        }
                    }

                    return label;
                // }
            })
            .call(wrapText, margins['right'] - 5, labelLineHeight);

    var annotWrapper = chartElement.append('g')
        .attr('class', 'annotations');

    annotWrapper.append('text')
        .text('Projected')
        .attr('class', 'projected-label')
        .attr('x', xScale(d3.time.format('%Y-%m').parse('2020-01')))
        .attr('y', 0)
        .attr('dy', -6);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
