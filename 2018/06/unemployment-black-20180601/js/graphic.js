// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var annotations = [];
var skipLabels = [ 'date', 'annotate', 'x_offset', 'y_offset' ];

// source: http://www.nber.org/cycles.html
var recession_dates = [
    { 'begin': '2001-03-01', 'end': '2001-11-01' },
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
    var datasets = { 'rate': DATA, 'gap': DATA_GAP };

    d3.keys(datasets).forEach(function(s, k) {
        datasets[s].forEach(function(d) {
            d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

            for (var key in d) {
                if (!_.contains(skipLabels, key) && d[key] != null && d[key].length > 0) {
                    d[key] = +d[key];

                    if (d['annotate'] == 'yes') {
                        if (typeof(annotations[key]) == 'undefined') {
                            annotations[key] = [];
                        }
                        annotations[key].push({ 'date': d['date'],
                                                'amt': d[key],
                                                'x_offset': +d['x_offset'],
                                                'y_offset': +d['y_offset'],
                                                'series': key });
                    }
                }
            }
        });
    });

    recession_dates.forEach(function(d) {
        d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
        d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
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
    //        }).filter(function(d) {
    //            return d['amt'].length > 0;
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

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    // vars
    var margins = {
        top: 5,
        right: 85,
        bottom: 20,
        left: 45
    };
    var roundTicksFactor = 10;

    // Mobile
    if (isMobile) {
        margins['right'] = 70;
    }

    // Render the rate chart!
    containerElement.append('div')
        .attr('class', 'chart rate');

    renderLineChart({
        container: '#line-chart .chart.rate',
        width: containerWidth,
        data: dataSeries,
        margins: margins,
        roundTicksFactor: roundTicksFactor,
        title: LABELS['hed_rate']
    });

    // Render the gap chart!
    containerElement.append('div')
        .attr('class', 'chart gap');

    renderAreaChart({
        container: '#line-chart .chart.gap',
        width: containerWidth,
        data: DATA_GAP,
        margins: margins,
        roundTicksFactor: roundTicksFactor,
        title: LABELS['hed_gap']
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

    var margins = config['margins'];
    var roundTicksFactor = config['roundTicksFactor'];

    var ticksX = 10;
    var ticksY = 10;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h3')
        .html(config['title']);

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
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([ '#787878', COLORS['red3'] ]);

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

    var annoDots = chartElement.append('g')
        .attr('class', 'dots value')
        .selectAll('g')
        .data(function(d) {
            var series = d3.entries(annotations).filter(function(v,k) {
                return v['key'] != 'Gap';
            });
            console.log(series);
            return series;
        })
        .enter().append('g')
            .attr('class', function(d) {
                return classify(d['key']);
            });
    annoDots.selectAll('circle')
        .data(function(d){
            return d['value'];
        })
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['date']);
            })
            .attr('cy', function(d) {
                return yScale(d['amt']);
            })
            .attr('fill', function(d) {
                return colorScale(d['series']);
            })
            .attr('r', 4);
    annoDots.selectAll('text')
        .data(function(d){
            return d['value'];
        })
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
            .attr('fill', function(d) {
                return colorScale(d['series']);
            })
            .text(function(d, i) {
                var label = d['amt'].toFixed(1) + '%';
                var lastAnnot = annotations[d['series']].length - 1;
                if (i == lastAnnot) {
                    label = d['series'] + ': ' + label;
                }
                return label;
            });

    chartElement.append('text')
        .classed('chart-label', true)
        .attr('x', function(){
            var dates = recession_dates[0];
            return xScale(dates['begin']) + ((xScale(dates['end']) - xScale(dates['begin'])) / 2);
        })
        .attr('y', 15)
        .text('Recession');
}

/*
 * Render a line chart.
 */
var renderAreaChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'Gap';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 1.5 : 4.5;

    var margins = config['margins'];
    var roundTicksFactor = config['roundTicksFactor'];

    var ticksX = 10;
    var ticksY = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h3')
        .html(config['title']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ]);

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
        .domain([ min, max ])
        .range([ chartHeight, 0 ]);

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
            return d + ' pts.';
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
    var area = d3.svg.area()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y0(chartHeight)
        .y1(function(d) {
            return yScale(d[valueColumn]);
        });

    // area chart
    chartElement.append('path')
        .datum(config['data'])
        .attr('class', 'area')
        .attr('d', area);

    // annotation
    var annoDots = chartElement.append('g')
        .attr('class', 'dots value')
        .selectAll('g')
        .data(function(d) {
            var series = d3.entries(annotations).filter(function(v,k) {
                return v['key'] == 'Gap';
            });
            return series;
        })
        .enter().append('g')
            .attr('class', function(d) {
                return classify(d['key']);
            });
    annoDots.selectAll('circle')
        .data(function(d){
            return d['value'];
        })
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['date']);
            })
            .attr('cy', function(d) {
                return yScale(d['amt']);
            })
            .attr('fill', COLORS['red3'])
            .attr('r', 4);
    annoDots.selectAll('text')
        .data(function(d){
            return d['value'];
        })
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
            .attr('fill', COLORS['red3'])
            .text(function(d, i) {
                var label = d['amt'].toFixed(1) + ' pts.';
                var lastAnnot = annotations[d['series']].length - 1;
                if (i == lastAnnot) {
                    label = d['series'] + ': ' + label;
                }
                return label;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
