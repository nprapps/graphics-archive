// Global vars
var SIDEBAR_THRESHOLD = 280;
var pymChild = null;
var isMobile = false;
var isSidebar = false;
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
        // d['date'] = d3.time.format('%m').parse(d['date']);

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

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // Render the chart!
    renderLineChart({
        container: '#line-chart',
        width: containerWidth,
        data: dataSeries
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

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 75,
        bottom: 20,
        left: 50
    };

    var ticksX = 10;
    var ticksY = 8;
    var roundTicksFactor = 11000;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        margins['right'] = 45;
    }
    if (isSidebar) {
        margins['left'] = 32;
        ticksY = 5;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var months = _.pluck(DATA, 'date');
    // var xScale = d3.time.scale()
    //     .domain(d3.extent(config['data'][0]['values'], function(d) {
    //         return d['date'];
    //     }))
    //     .range([ 0, chartWidth ])
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(DATA, 'date'))
        // .domain([ 'Oct.', 'Nov.', 'Dec.', 'Jan.' ])
        .rangePoints([ 0, chartWidth ]);

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

    // min = 30000;
    // max = 110000;
    //
    min = 40000;
    max = 100000;

    // min = 40000;
    // max = 80000;

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        // .range([ '#dddddd','#c6c6c6','#afafaf','#999999', COLORS['red3'] ]);
        // .range([ '#f8e2ca','#f4bea6','#ed9a82','#e27560', COLORS['red2'] ]);
        .range([ COLORS['red6'], COLORS['red4'], COLORS['red2'] ]);

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
            if (((isMobile && (i % 2 == 0)) && !isSidebar) || (isSidebar && (i % 4 == 0)) || !isMobile) {
                return d;
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            if (isSidebar) {
                var val = d / 1000;
                return val.toFixed(0) + 'k';
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
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                if (d['name'] == 'FY 2016') {
                    return xScale('Nov.');
                } else {
                    var last = d['values'][d['values'].length - 1];
                    return xScale(last[dateColumn]) + 5;
                }
            })
            .attr('y', function(d, i) {
                if (d['name'] == 'FY 2016') {
                    return yScale(64000);
                } else {
                    var last = d['values'][d['values'].length - 1];
                    return yScale(last[valueColumn]) + 3;
                }
            })
            .attr('dx', function(d, i) {
                if (isSidebar && d['name'] == 'FY 2016') {
                    return -3;

                }
                if (d['name'] == 'FY 2016') {
                    return 0;
                } else {
                    return 0;
                }
            })
            .attr('dy', function(d, i) {
                if (isSidebar) {
                    switch(d['name']) {
                        case 'FY 2016':
                            return -3;
                            break;
                        case 'FY 2015':
                            return -3;
                            break;
                        case 'FY 2014':
                            return -3;
                            break;
                        case 'FY 2013':
                            return 3;
                            break;
                        case 'FY 2012':
                            return -2;
                            break;
                    }
                } else {
                    switch(d['name']) {
                        case 'FY 2014':
                            return -4;
                            break;
                        case 'FY 2013':
                            return 4;
                            break;
                    }
                }
            })
            .text(function(d) {
                return d['name'];
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
