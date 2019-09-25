// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var charts = '';

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
        var chartData = DATA[v]['data'];
        chartData.forEach(function(d) {
            d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

            for (var key in d) {
                if (key != 'date' && d[key] != null && d[key].length > 0) {
                    if (isNaN(+d[key])) {
                        d[key] = null;
                    } else {
                        d[key] = +d[key];
                    }
                }
            }
        });

        /*
         * Restructure tabular data for easier charting.
         */
        for (var column in chartData[0]) {
            if (column == 'date') {
                continue;
            }

            if (typeof dataSeries[v] == 'undefined') {
                dataSeries[v] = [];
            }

            dataSeries[v].push({
                'name': column,
                'values': chartData.map(function(d) {
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
    var numCols = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 1;
    } else {
        isMobile = false;
        numCols = 2;
    }

    var graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1))) / numCols);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    charts.forEach(function(v,k) {
        var chartData = dataSeries[v];
        var chartTitle = DATA[v]['title'];
        var colorRange = null;
        var roundTicksFactor = null;
        var units = null;

        var chartElement = containerElement.append('div')
            .attr('class', 'chart ' + classify(v));

        if (numCols > 1) {
            chartElement.attr('style', function() {
                var s = ''
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (k % numCols > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        switch(v) {
            case 'oil':
                colorRange = [ COLORS['red3'] ],
                roundTicksFactor = 20;
                units = '/barrel'
                break;
            case 'gas':
                colorRange = [ COLORS['orange3'] ],
                roundTicksFactor = 2;
                units = '/gallon'
                break;
        }

        // Render the chart!
        renderLineChart({
            container: '.chart.' + classify(v),
            width: graphicWidth,
            data: chartData,
            title: chartTitle,
            id: k,
            colorRange: colorRange,
            roundTicksFactor: roundTicksFactor,
            units: units
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

    var aspectWidth = isMobile ? 16 : 4;
    var aspectHeight = isMobile ? 9 : 3;

    var margins = {
        top: 5,
        right: 75,
        bottom: 20,
        left: 30
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = config['roundTicksFactor'];

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

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
        .range([ 0, chartWidth ]);

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
        .range(config['colorRange']);

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
            return getAPMonth(d) + ' ' + '\u2019' + fmtYearAbbrev(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d,i) {
            return '$' + d;
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
        .attr('class', 'value')
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
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var label = '$' + last[valueColumn].toFixed(2) + config['units'];
                return label;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
