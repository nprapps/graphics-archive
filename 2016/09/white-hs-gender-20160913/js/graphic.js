// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
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
    charts = d3.keys(DATA);
    charts.forEach(function(v,k) {
        var cData = DATA[v];

        cData.forEach(function(d) {
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
        dataSeries[v] = [];
        for (var column in cData[0]) {
            if (column == 'date') {
                continue;
            }

            dataSeries[v].push({
                'name': column,
                'values': cData.map(function(d) {
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

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    charts.forEach(function(v,k) {
        var chartId = 'chart-' + classify(v);

        var chartElement = containerElement.append('div')
            .attr('class', 'graphic')
            .attr('id', chartId);

        if (!isMobile) {
            chartElement.attr('style', function() {
                var s = '';
                s += 'float: left; ';
                s += 'width: ' + graphicWidth + 'px; ';
                if (k % 2 > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        // Render the chart!
        renderLineChart({
            container: '#' + chartId,
            width: graphicWidth,
            data: dataSeries[v],
            yDomain: [ 0, 100 ],
            title: v
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

    var aspectWidth = isMobile ? 16 : 4;
    var aspectHeight = isMobile ? 9 : 3;

    var margins = {
        top: 10,
        right: 25,
        bottom: 20,
        left: 37
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = isMobile ? 3 : 5;
        margins['right'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text('White ' + config['title'] + ' (High School Or Less)');

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
        .domain([min, max])
        .range([chartHeight, 0]);

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

    // colorScale
    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['red3'], COLORS['blue3'], '#ccc' ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            return '\u2019' + fmtYearAbbrev(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
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
        .attr('class', 'value value-start')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var first = d['values'][0];

                return xScale(first[dateColumn]);
            })
            .attr('y', function(d) {
                var first = d['values'][0];
                var compare = d['values'][3];
                var offset = first[valueColumn] - compare[valueColumn] < 0 ? 12 : -6;

                return yScale(first[valueColumn]) + offset;
            })
            .text(function(d) {
                var first = d['values'][0];
                var value = first[valueColumn];

                var label = first[valueColumn].toFixed(0) + '%';

                return label;
            });

    chartElement.append('g')
        .attr('class', 'value value-end')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 2;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];
                var compare = d['values'][d['values'].length - 3];
                var offset = last[valueColumn] - compare[valueColumn] < 0 ? 12 : -6;

                return yScale(last[valueColumn]) + offset;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = last[valueColumn].toFixed(0) + '%';

                return label;
            });

    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
            .data(config['data'])
                .enter()
        .append('circle')
            .attr('cx', function(d, i) {
                var last = d['values'][0];

                return xScale(last[dateColumn]);
            })
            .attr('cy', function(d) {
                var last = d['values'][0];

                return yScale(last[valueColumn]);
            })
            .attr('r', 3)
            .attr('fill', function(d) {
                return colorScale(d['name']);
            });

    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
            .data(config['data'])
                .enter()
        .append('circle')
            .attr('cx', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]);
            })
            .attr('cy', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]);
            })
            .attr('r', 3)
            .attr('fill', function(d) {
                return colorScale(d['name']);
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
