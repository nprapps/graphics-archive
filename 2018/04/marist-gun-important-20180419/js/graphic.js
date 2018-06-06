// Global vars
var pymChild = null;
var isMobile = false;
var charts = [];
var dataSeries = [];
var skipLabels = [ 'date', 'chart' ];

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
    charts = _.uniq(_.pluck(DATA, 'chart'));

    var dataFiltered = [];
    _.each(charts, function(d,i) {
        dataFiltered[d] = [];
    });

    DATA.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

        for (var key in d) {
            if (!_.contains(skipLabels, key) && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }

        var thisChart = d['chart'];
        dataFiltered[thisChart].push(d);
    });

    /*
     * Restructure tabular data for easier charting.
     */
    _.each(charts, function(v,k) {
        for (var column in dataFiltered[v][0]) {
            if (_.contains(skipLabels, column)) {
                continue;
            }

            if (typeof dataSeries[v] == 'undefined') {
                dataSeries[v] = [];
            }

            dataSeries[v].push({
                'name': column,
                'values': dataFiltered[v].map(function(d) {
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
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var gutterWidth = 22;
    var numCols = 1;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
        numCols = 2;
    }

    var graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1))) / numCols);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    _.each(charts, function(v,k) {
        var chartData = dataSeries[v];
        var chartElement = containerElement.append('div')
            .attr('class', 'chart chart-' + k);

        if (numCols > 1) {
            chartElement.attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (k % numCols != 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            })
        }

        // Render the chart!
        renderLineChart({
            container: '.chart.chart-' + k,
            width: graphicWidth,
            data: chartData,
            yDomain: [ 0, 100 ],
            title: v,
            id: k
        });
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

    var aspectWidth = isMobile ? 1 : 1;
    var aspectHeight = isMobile ? 1.2 : 1.3;

    var maxChartWidth = 125;
    var minMarginWidth = 80;

    var margins = {
        top: 20,
        right: minMarginWidth,
        bottom: 0,
        left: minMarginWidth,
    };

    var ticksX = 2;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    if (chartWidth > maxChartWidth) {
        var widthDiff = chartWidth - maxChartWidth;
        chartWidth = maxChartWidth;
        margins['left'] += widthDiff / 2;
        margins['right'] += widthDiff / 2;
    }
    if (margins['left'] < minMarginWidth) {
        chartWidth = config['width'] - (minMarginWidth * 2);
        var widthDiff = config['width'] - chartWidth;
        margins['left'] = widthDiff / 2;
        margins['right'] = widthDiff / 2;
    }
    var chartHeight = 200;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');
    containerElement.append('h3')
        .text(config['title']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
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
        // .range([ '#aaa', COLORS['red3'], COLORS['blue2'] ]);
        .range([ '#148743', '#f05b4e', '#498dcb' ]);

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

    // background
    var bg = chartElement.append('rect')
        .attr('class', 'bg')
        .attr('x', 0)
        .attr('width', chartWidth)
        .attr('y', 0)
        .attr('height', chartHeight);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            return formatAPMonth(d) + ' ' + fmtYearFull(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            return null;
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, 0))
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
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    chartElement.append('g')
        .attr('class', 'value first')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var first = d['values'][0];
                return xScale(first[dateColumn]) - 5;
            })
            .attr('y', function(d) {
                var first = d['values'][0];
                return yScale(first[valueColumn]) + 3;
            })
            .attr('fill', function(d) {
                return colorScale(d['name']);
            })
            .text(function(d) {
                var first = d['values'][0];
                var label = d['name'] + ': ' + first[valueColumn].toFixed(0) + '%';
                return label;
            });

    chartElement.append('g')
        .attr('class', 'value last')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .attr('fill', function(d) {
                return colorScale(d['name']);
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var first = d['values'][0];
                var change = last[valueColumn].toFixed(0) - first[valueColumn].toFixed(0);
                if (change > 0) {
                    change = '+' + change;
                }
                var label = last[valueColumn].toFixed(0) + '% (' + change + ' pts.)';
                return label;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
