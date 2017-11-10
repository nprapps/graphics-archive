// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var skipLabels = [ 'chart', 'date', 'offset' ];
var charts = [];

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
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
    */
    charts = _.uniq(_.pluck(DATA, 'chart'));

    _.each(charts, function(d, i) {
        dataSeries[d] = [];

        var chartData = DATA.filter(function(v,k) {
            return v['chart'] == d;
        });

        for (var column in chartData[0]) {
            if (_.contains(skipLabels, column)) {
                continue;
            }

            dataSeries[d].push({
                'name': column,
                'values': chartData.map(function(d) {
                    return {
                        'date': d['date'],
                        'amt': d[column]
                    };
                // filter out empty data. uncomment this if you have inconsistent data.
                // }).filter(function(d) {
                //     return d['amt'] != null;
                })
            });
        }
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
    var numCharts = charts.length;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        if (numCharts > 1) {
            graphicWidth = Math.floor((containerWidth - ((numCharts - 1) * gutterWidth)) / numCharts);
        } else {
            graphicWidth = containerWidth;
        }
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    charts.forEach(function(d, i) {
        var chartData = dataSeries[d];

        var chartWrapper = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        if (!isMobile && numCharts > 1) {
            chartWrapper.attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (i > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            })
        }

        // Render the chart!
        renderLineChart({
            container: '.chart.' + classify(d),
            width: graphicWidth,
            data: chartData,
            title: d,
            yDomain: [ 0, 75 ],
            tickValues: [ 0, 25, 50, 75 ]
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

    var aspectWidth = isMobile ? 16 : 1.1;
    var aspectHeight = isMobile ? 9 : 1;

    var margins = {
        top: 5,
        right: 20,
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

    containerElement.append('h3')
        .text(config['title']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var min = config['yDomain'][0];
    var max = config['yDomain'][1];

    var yScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([ '#999', COLORS['orange3'] ]);

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
            if (config['width'] < 200) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickValues(config['tickValues'])
        .tickFormat(function(d) {
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
    //     chartElement.append('line')
    //         .attr('class', 'zero-line')
    //         .attr('x1', 0)
    //         .attr('x2', chartWidth)
    //         .attr('y1', yScale(50))
    //         .attr('y2', yScale(50));
    // }

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        // .interpolate('monotone')
        .defined(function(d) {
            return d[valueColumn] != null;
        })
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
        .enter()
        .append('g')
            .attr('class', function(d) {
                return classify(d['name']);
            });

    dotWrapper.selectAll('circle')
        .data(function(d) {
            var filteredData = _.each(d['values'], function(v,k) {
                v['series'] = d['name'];
            }).filter(function(v,k) {
                return v[valueColumn] != null;
            });
            return filteredData;
        })
        .enter()
        .append('circle')
            .attr('cx', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('cy', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('r', 3)
            .attr('fill', function(d) {
                return colorScale(d['series']);
            });

    dotWrapper.selectAll('text')
        .data(function(d) {
            var filteredData = _.each(d['values'], function(v,k) {
                v['series'] = d['name'];
            }).filter(function(v,k) {
                return v[valueColumn] != null;
            });
            return filteredData;
        })
        .enter()
        .append('text')
            .text(function(d) {
                return d[valueColumn] + '%';
            })
            .attr('x', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dy', function(d) {
                switch(d['series']) {
                    case 'Support':
                        return -8;
                        break;
                    case 'Oppose':
                        return 15;
                        break;
                }
            })
            .attr('dx', -3)
            .attr('fill', function(d) {
                return colorScale(d['series']);
            });

    if (config['title'] == 'Charter schools') {
        chartElement.append('g')
            .attr('class', 'categories')
            .selectAll('text')
            .data(colorScale.domain())
            .enter()
            .append('text')
                .text(function(d) {
                    return d;
                })
                .attr('x', 0)
                .attr('y', function(d) {
                    switch(d) {
                        case 'Support':
                            return yScale(55);
                            break;
                        case 'Oppose':
                            return yScale(26);
                            break;
                    }
                })
                .attr('dx', -3)
                .attr('dy', function(d) {
                    switch(d) {
                        case 'Support':
                            return -28;
                            break;
                        case 'Oppose':
                            return 35;
                            break;
                    }
                })
                .attr('fill', function(d) {
                    return colorScale(d);
                });
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
