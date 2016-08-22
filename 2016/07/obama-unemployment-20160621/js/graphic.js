// Global vars
var pymChild = null;
var isMobile = false;
var series = [ 'unemployment', 'wages' ];
var dataSeries = [];

var recession_dates = [
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
];

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
    recession_dates.forEach(function(d) {
        d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
        d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
    });

    UNEMPLOYMENT.forEach(function(d) {
        d['date'] = d3.time.format('%Y-%m-%d').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    WAGES.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    var unemploymentFormatted = [];
    var wagesFormatted = [];

    for (var column in UNEMPLOYMENT[0]) {
        if (column == 'date') {
            continue;
        }

        unemploymentFormatted.push({
            'name': column,
            'values': UNEMPLOYMENT.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
            })
        });
    }

    for (var column in WAGES[0]) {
        if (column == 'date') {
            continue;
        }

        wagesFormatted.push({
            'name': column,
            'values': WAGES.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
            })
        });
    }

    dataSeries['unemployment'] = unemploymentFormatted;
    dataSeries['wages'] = wagesFormatted;
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor(containerWidth * 0.48);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    series.forEach(function(d, i) {
        var chartContainer = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        chartContainer.append('h1')
            .html(TITLES[d]);

        var colorRange = null;
        var yDomain = null;
        var yUnits = null;
        switch(d) {
            case 'unemployment':
                colorRange = [ COLORS['blue1'], COLORS['blue4'] ];
                yDomain = [ 0, 20];
                yUnits = 'pct';
                break;
            case 'wages':
                colorRange = [ COLORS['teal5'], COLORS['teal2'] ];
                yDomain = [ 16, 24];
                yUnits = 'dollars';
                break;
        }

        // Render the chart!
        renderLineChart({
            container: '#line-chart .chart.' + classify(d),
            width: graphicWidth,
            data: dataSeries[d],
            colorRange: colorRange,
            yDomain: yDomain,
            yUnits: yUnits
        });
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

    var aspectWidth = 4;
    var aspectHeight = 3;

    var margins = {
        top: 18,
        right: 40,
        bottom: 20,
        left: 32
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
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

    var yScale = d3.scale.linear()
        .domain(config['yDomain'])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range(config['colorRange']);

    /*
     * Render the HTML legend.
     */
    // var legend = containerElement.append('ul')
    //     .attr('class', 'key')
    //     .selectAll('g')
    //     .data(config['data'])
    //     .enter().append('li')
    //         .attr('class', function(d, i) {
    //             return 'key-item ' + classify(d['name']);
    //         });
    //
    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return colorScale(d['name']);
    //     });
    //
    // legend.append('label')
    //     .text(function(d) {
    //         return d['name'];
    //     });

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
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            switch(config['yUnits']) {
                case 'dollars':
                    return '$' + d;
                    break;
                case 'pct':
                    return d + '%';
                    break;
                default:
                    return d;
                    break;
            }
        });

    var recession = chartElement.append('g')
        .attr('class', 'recession')
        .selectAll('rect')
        .data(recession_dates)
        .enter()
            .append('rect')
                .attr('x', function(d) {
                    return xScale(d['begin']);
                })
                .attr('width', function(d) {
                    return xScale(d['end']) - xScale(d['begin']);
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
            });

    chartElement.append('g')
        .attr('class', 'value-label')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .text(function(d) {
                return d['name'];
            })
            .attr('fill', function(d) {
                return colorScale(d['name']);
            })
            .attr('x', chartWidth)
            .attr('y', function(d) {
                switch(d['name']) {
                    case 'Unemployment':
                        return yScale(3);
                        break;
                    case 'Underemployment':
                        return yScale(17.5);
                        break;
                    case 'As originally reported':
                        return yScale(18);
                        break;
                    case 'In April 2016 dollars':
                        return yScale(22);
                        break;
                }
            });

    // annotations
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');
    annotations.append('line')
        .attr('class', 'inauguration')
        .attr('x1', xScale(d3.time.format('%Y-%m-%d').parse('2009-01-20')))
        .attr('x2', xScale(d3.time.format('%Y-%m-%d').parse('2009-01-20')))
        .attr('y1', -5)
        .attr('y2', chartHeight);
    annotations.append('text')
        .attr('class', 'inauguration')
        .text('Obama takes office')
        .attr('x', xScale(d3.time.format('%Y-%m-%d').parse('2009-01-20')))
        .attr('dx' -5)
        .attr('y', -8);

    config['data'].forEach(function(d,i) {
        var lineName = d['name'];
        var points = [ 24, d['values'].length - 1 ];
        var lastPoint = points.length - 1;

        points.forEach(function(v,k) {
            annotations.append('circle')
                .attr('class', 'inauguration')
                .attr('cx', xScale(d['values'][v]['date']))
                .attr('cy', yScale(d['values'][v]['amt']))
                .attr('r', 4)
                .attr('fill', colorScale(lineName));

            annotations.append('text')
                .attr('class', function() {
                    var c = 'value ' + classify(lineName);
                    if (k == lastPoint) {
                        c += ' last-point';
                    }
                    return c;
                })
                .text(function() {
                    var val = d['values'][v]['amt'];
                    switch(config['yUnits']) {
                        case 'dollars':
                            return '$' + val.toFixed(2);
                            break;
                        case 'pct':
                            return val.toFixed(1) + '%';
                            break;
                        default:
                            return val;
                            break;
                    }
                })
                .attr('x', xScale(d['values'][v]['date']))
                .attr('y', yScale(d['values'][v]['amt']))
                .attr('dx', function() {
                    if (k == lastPoint) {
                        return 8;
                    } else {
                        if (lineName == 'Unemployment') {
                            return 6;
                        } else {
                            return -6;
                        }
                    }
                })
                .attr('dy', function() {
                    if (k == lastPoint) {
                        return 3;
                    } else {
                        if (lineName == 'Unemployment') {
                            return 6;
                        } else {
                            return -6;
                        }
                    }
                })
                .attr('fill', colorScale(d['name']));
        })
    })
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
