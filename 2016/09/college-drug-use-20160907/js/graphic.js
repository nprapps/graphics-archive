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

    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    dataSeries.forEach(function(v,k) {
        var chartId = 'chart-' + classify(v['name']);

        containerElement.append('div')
            .attr('class', 'graphic')
            .attr('id', chartId);

        var chartWidth;

        if (isMobile) {
            chartWidth = Math.floor(containerWidth * 0.49);
        } else {
            chartWidth = Math.floor(containerWidth / 5) - 15;
        }

        // Render the chart!
        renderLineChart({
            container: '#' + chartId,
            width: chartWidth,
            data: [v],
            overallData: dataSeries,
            chartIndex: k
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

    var aspectWidth = isMobile ? 4 : 9;
    var aspectHeight = isMobile ? 3 : 13;

    var showAxisLabels = config['chartIndex'] === 0 || isMobile && config['chartIndex'] % 2 === 1;

    var margins = {
        top: 10,
        right: showAxisLabels ? 5 : 23,
        bottom: 20,
        left: showAxisLabels ? 23 : 5
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
        .text(config['data'][0]['name']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(dataSeries[0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var min = d3.min(dataSeries, function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(dataSeries, function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

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
            if (showAxisLabels) {
                return d;
            } else {
                return '';
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
                return COLORS['blue3'];
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
                var offset = first[valueColumn] - compare[valueColumn] < -3 ? 12 : -6;

                return yScale(first[valueColumn]) + offset;
            })
            .text(function(d) {
                var first = d['values'][0];
                var value = first[valueColumn];

                var label = first[valueColumn].toFixed(1);

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

                var label = last[valueColumn].toFixed(1);

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
            .attr('r', 3);

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
            .attr('r', 3);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
