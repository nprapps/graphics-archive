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
        d['date'] = d3.time.format('%Y').parse(d['date']);

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

    var numCharts = 6;
    var numCols = null;
    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 2;
    } else {
        isMobile = false;
        numCols = 3;
    }

    graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1))) / numCols);

    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    // define y scale
    var roundTicksFactor = 20;
    var yMin = d3.min(dataSeries, function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v['amt'] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (yMin > 0) {
        yMin = 0;
    }

    var yMax = d3.max(dataSeries, function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v['amt'] / roundTicksFactor) * roundTicksFactor;
        })
    });

    // define x scale
    var xScale = d3.extent(dataSeries[10]['values'], function(d) {
        return d['date'];
    });

    for (var i = 0; i < numCharts; i++) {
        var chartData = null;
        switch(i) {
            case 0:
                chartData = [ dataSeries[0], dataSeries[10] ];
                break;
            case 1:
                chartData = [ dataSeries[1], dataSeries[10] ];
                break;
            case 2:
                chartData = [ dataSeries[2], dataSeries[10] ];
                break;
            case 3:
                chartData = [ dataSeries[3], dataSeries[4], dataSeries[5], dataSeries[10] ];
                break;
            case 4:
                chartData = [ dataSeries[6], dataSeries[7], dataSeries[8], dataSeries[10] ];
                break;
            case 5:
                chartData = [ dataSeries[9], dataSeries[10] ];
                break;
        }

        var chartWrapper = containerElement.append('div')
            .attr('class', 'chart chart-' + i)
            .attr('style', function() {
                var s = '';
                s += 'float: left; '
                s += 'width: ' + graphicWidth + 'px;'
                if (i % numCols == 0) {
                    s += 'clear: both; ';
                } else {
                    s += 'margin-left: ' + gutterWidth + 'px;'
                }
                return s;
            });

        // Render the chart!
        renderLineChart({
            container: '#line-chart .chart-' + i,
            width: graphicWidth,
            data: chartData,
            title: chartData[0]['name'],
            yScale: [ yMin, yMax ],
            xScale: xScale,
            idx: i
        });
    };

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

    var aspectWidth = 1;
    var aspectHeight = 1;

    var margins = {
        top: 5,
        right: 30,
        bottom: 20,
        left: 32
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h3')
        .text(config['title']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(config['xScale'])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain(config['yScale'])
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
            .attr('d', function(d) {
                return line(d['values']);
            });

    var numValues = config['data'].length;
    var valuesShown = null;
    if (numValues == 2) {
        valuesShown = config['data'];
    } else {
        valuesShown = [ config['data'][2], config['data'][3] ];
    }

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(valuesShown)
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .attr('dy', function(d,i) {
                switch(config['idx']) {
                    case 0:
                        if (i == 0) {
                            return 3;
                        } else {
                            return -3;
                        }
                        break;
                    case 2:
                        if (i == 0) {
                            return 3;
                        } else {
                            return -3;
                        }
                        break;
                    case 4:
                        if (i == 0) {
                            return -3;
                        } else {
                            return 3;
                        }
                        break;
                    default:
                        return 0;
                        break;
                }
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = last[valueColumn].toFixed(0) + '%';

                return label;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
