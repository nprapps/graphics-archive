// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var annotations = [];
var skipLabels = [ 'date', 'annotate', 'x_offset', 'y_offset' ];

// source: http://www.nber.org/cycles.html
var recession_dates = [
    // { 'begin': '2001-03-01', 'end': '2001-11-01' },
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
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    UNEMPLOYMENT_DATA.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

        for (var key in d) {
            if (!_.contains(skipLabels, key) && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }

        if (d['annotate'] == 'yes') {
            annotations.push({ 'date': d['date'], 'amt': d['amt'], 'x_offset': +d['x_offset'], 'y_offset': +d['y_offset'] });
        }
    });

    recession_dates.forEach(function(d) {
        d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
        d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in UNEMPLOYMENT_DATA[0]) {
        if (_.contains(skipLabels, column)) {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': UNEMPLOYMENT_DATA.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
    // filter out empty data. uncomment this if you have inconsistent data.
    //        }).filter(function(d) {
    //            return d['amt'].length > 0;
            })
        });
    }

    // format payroll/wage data
    if (SECONDARY_MODE != 'none') {
        SECONDARY_DATA.forEach(function(d, i) {
            d['date'] = d3.time.format('%Y-%m-%d').parse(d['label']);
            d['change'] = +d['change'];
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

    // Render the chart!
    // Unemployment chart
    renderLineChart({
        container: '#line-chart',
        width: containerWidth,
        data: dataSeries
    });

    // Payrolls chart
    if (SECONDARY_MODE != 'none') {
        var pYDomain = null;
        switch(SECONDARY_MODE) {
            case 'payrolls-month':
                pYDomain = [ -800, 600 ];
                ticksY = 8;
                ticksYMobile = 5;
                break;
            case 'payrolls-year':
                pYDomain = [ -8000, 4000 ];
                ticksY = 8;
                ticksYMobile = 5;
                break;
            case 'wages':
                pYDomain = [ 0, 5 ];
                ticksY = 5;
                ticksYMobile = 5;
                break;
        }

        renderColumnChart({
            container: '#column-chart',
            width: containerWidth,
            data: SECONDARY_DATA,
            yDomain: pYDomain,
            ticksY: [ ticksY, ticksYMobile ]
        });
    }

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
    var aspectHeight = isMobile ? 3 : 7;

    var margins = {
        top: 5,
        right: 40,
        bottom: 20,
        left: 42
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 12;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        // margins['right'] = 30;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

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
        .domain([ min, max ])
        .range([ chartHeight, 0 ]);

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
            return d + '%';
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
        .attr('class', 'dots')
        .selectAll('text')
        .data(annotations)
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['date']);
            })
            .attr('cy', function(d) {
                return yScale(d['amt']);
            })
            .attr('fill', function(d) {
                return colorScale('amt');
            })
            .attr('r', 4);

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(annotations)
        .enter().append('text')
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
            .text(function(d) {
                return d['amt'].toFixed(1) + '%';;
            });

    chartElement.append('text')
        .classed('chart-label', true)
        .attr('x', function(){
            var dates = recession_dates[0];
            return xScale(dates['begin']) + ((xScale(dates['end']) - xScale(dates['begin'])) / 2);
        })
        .attr('y', function() {
            if (isMobile) {
                return chartHeight - 15;
            } else {
                return 20;
            }
        })
        .text('Recession');
}


/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'date';
    var valueColumn = 'change';

    var aspectWidth = isMobile ? 2 : 8;
    var aspectHeight = isMobile ? 1 : 2;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 40,
        bottom: 20,
        left: 42
    };

    var ticksY = config['ticksY'][0];
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksY = config['ticksY'][1];
        roundTicksFactor = 200;
    }

    var xTickValues = [];
    config['data'].forEach(function(d,i) {
        var fmtMonthNum = d3.time.format('%m');
        if (fmtMonthNum(d['date']) == '01') {
            xTickValues.push(d['date']);
        }
    });

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
        .rangeBands([ 0, chartWidth ], 0)
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
        .tickValues(xTickValues)
        .tickFormat(function(d, i) {
            if (i % 1 == 0 && !isMobile) {
                return fmtYearFull(d);
            } else if (i % 2 == 1 && isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d != 0) {
                var val = null;
                switch (SECONDARY_MODE) {
                    case 'payrolls-month':
                        val = d + 'K';
                        break;
                    case 'payrolls-year':
                        val = (d/1000).toFixed(0) + 'M';
                        break;
                    case 'wages':
                        val = d.toFixed(0) + '%';
                        break;
                }
                if (d > 0) {
                    val = '+' + val;
                }
                return val;
            } else {
                return d;
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
                    return xScale(d['end']) - xScale(d['begin']) + xScale.rangeBand();
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
                if (d['status']) {
                    c += ' ' + classify(d['status']);
                }
                if (d[valueColumn] < 0) {
                    c += ' negative';
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

    // show value for most recent month
    chartElement.append('g')
        .attr('class', 'value')
        .append('text')
            .attr('x', chartWidth + 5)
            .attr('y', function() {
                var last = config['data'][config['data'].length - 1];
                var value = last['change'];
                return yScale(value);
            })
            .attr('dy', 10)
            .text(function() {
                var last = config['data'][config['data'].length - 1];
                var value = last['change'];
                var val = null;

                switch(SECONDARY_MODE) {
                    case 'payrolls-month':
                        val = value + 'K';
                        break;
                    case 'payrolls-year':
                        val = (value/1000).toFixed(0) + 'M';
                        break;
                    case 'wages':
                        val = value.toFixed(1) + '%';
                        break;
                }
                if (value > 0) {
                    val = '+' + val;
                }
                return val;
            });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
