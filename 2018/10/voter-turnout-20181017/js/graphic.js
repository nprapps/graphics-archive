// Global vars
var pymChild = null;
var isMobile = false;
var annotations = [];
var dataSeries = [];
var skipLabels = [ 'date', 'annotate', 'x_offset', 'y_offset', 'anchor' ];

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
            if (!_.contains(skipLabels, key) && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];

                if (d['annotate'] == 'yes') {
                    annotations.push({ 'date': d['date'],
                                       'amt': d[key],
                                       'x_offset': +d['x_offset'],
                                       'y_offset': +d['y_offset'],
                                       'anchor': d['anchor'] });
                }
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (_.contains(skipLabels, column)) {
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

    console.log(annotations);
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
    renderLineChart({
        container: '#line-chart',
        width: containerWidth,
        data: dataSeries,
        xDomain: [ d3.time.format('%Y').parse(LABELS['start_year']), d3.time.format('%Y').parse(LABELS['end_year']) ]
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
        right: 90,
        bottom: 20,
        left: 34
    };

    var labelLineHeight = 14;
    var roundTicksFactor = 10;
    var ticksX = 10;
    var ticksY = 10;
    var valueGap = 10;

    // Mobile
    if (isMobile) {
        labelLineHeight = 11;
        margins['right'] = 80;
        ticksX = 5;
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
    var xScale = d3.time.scale()
        .domain(config['xDomain'])
        .range([ 0, chartWidth ]);

    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    // if (min > 0) {
    //     min = 0;
    // }

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([ COLORS['orange5'], COLORS['orange3'], COLORS['orange3'], COLORS['orange3'] ]);

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
        .tickFormat(function(d, i) {
            return d + '%';
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
     * Render 0 value line.
     */
    // if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(50))
            .attr('y2', yScale(50));
    // }

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        // .interpolate('monotone')
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

    var dotWrapper = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('g')
        .data(config['data'])
        .enter().append('g')
            .attr('class', function(d) {
                return classify(d['name']);
            });
    dotWrapper.selectAll('circle')
        .data(function(d) {
            _.each(d['values'], function(v, k) {
                v['series'] = d['name'];
            })
            return d['values'];
        })
        .enter().append('circle')
            .attr('cx', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('cy', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('r', 4)
            .attr('fill', function(d) {
                return colorScale(d['series']);
            });

    var layers = [ 'dot value shadow', 'dot value' ];
    layers.forEach(function(v, k) {
        chartElement.append('g')
            .attr('class', v)
            .selectAll('text')
            .data(annotations)
            .enter().append('text')
                .text(function(d) {
                    return d['amt'].toFixed(1) + '%';;
                })
                .attr('x', function(d, i) {
                    return xScale(d['date']);
                })
                .attr('y', function(d) {
                    return yScale(d['amt']);
                })
                .attr('dx', function(d,i) {
                    return d['x_offset'] || 8;
                })
                .attr('dy', function(d, i) {
                    return d['y_offset'] || 3;
                })
                .attr('text-anchor', function(d, i) {
                    return d['anchor'] || 'start';
                });
    });

    chartElement.append('g')
        .attr('class', 'last value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = d['name'] + ': ' + last[valueColumn].toFixed(1) + '% in ' + fmtYearFull(last[dateColumn]);

                if (d['name'] == 'high') {
                    label = LABELS['end_label'];
                }

                return label;
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + valueGap;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];
                var offset = 3;

                if (d['name'] == 'high') {
                    offset = 15;
                }

                return yScale(last[valueColumn]) + offset;
            })
            .call(wrapText, margins['right'] - valueGap, labelLineHeight);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
