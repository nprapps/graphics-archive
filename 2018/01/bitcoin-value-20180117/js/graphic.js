// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var annotations = [];

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
    EVENTS.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
        d['num'] = +d['num'];
        d['y-offset'] = +d['y-offset'];
        d['x-offset'] = +d['x-offset'];
    });

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
                    'amt': d[column],
                    'max': d['High'],
                    'min': d['Low']
                };
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
    var maxColumn = 'max';
    var minColumn = 'min';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 4 : 9;

    var margins = {
        top: 5,
        right: 105,
        bottom: 50,
        left: 50
    };

    var ticksX = 5;
    var ticksY = 10;
    var roundTicksFactor = 10000;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 10;
        margins['right'] = 44;
        margins['left'] = 35;
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
        .range(['#ccc', '#ccc', COLORS['teal3']]);

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
     * Define textures
     */
    var textureProjected = textures.lines()
        // .orientation('vertical')
        .size(3)
        .strokeWidth(1)
        .thinner()
        .stroke('#ccc');

    chartWrapper.select('svg')
        .call(textureProjected);

    /*
     * Create D3 axes.
     */
    var fmtDate = d3.time.format('%b.%_d');
    var fmtDateMobile = d3.time.format('%m/%y');
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            return fmtDate(d);
        });

    if (!isMobile) {
        xAxis.tickValues([ (new Date(2017, 10, 01)), (new Date(2017, 10, 15)), (new Date(2017, 11, 01)), (new Date(2017, 11, 15)), (new Date(2017, 12, 01)), (new Date(2017, 12, 15)) ])
    }

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            if (isMobile) {
                if (d != 0) {
                    return '$' + d/1000 + 'K';
                } else {
                    return d;
                }
            } else {
                if (d != 0) {
                    return '$' + fmtComma(d);
                } else {
                    return d;
                }
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    var xAxisLabels = d3.selectAll('g.tick text')
        .call(wrapText, 45, 15);

    xAxisLabels.selectAll('tspan:nth-child(1)')
        .attr('dy', '7px');

    xAxisLabels.selectAll('tspan:nth-child(2)')
        .attr('dy', '18px');

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
     * Render area between lines.
     */
     var area = d3.svg.area()
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y0(function(d) {
            return yScale(d[minColumn])
        })
        .y1(function(d) {
            return yScale(d[maxColumn]);
        });

    chartElement.append('g')
        .attr('class', 'area')
        .selectAll('path')
        .data(config['data'].filter(function(d,i) {
            return d['name'] == 'Average';
        }))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'area ' + classify(d['name']);
            })
            .attr('d', function(d) {
                return area(d['values']);
            })
            .style('fill', textureProjected.url());

    /*
     * Render event markers
     */
    var eventLabelWidth = isMobile ? 110 : 125;
    var eventMarkers = chartElement.append('g')
        .attr('class', 'events')
        .selectAll('line')
        .data(EVENTS)
        .enter();

    eventMarkers.append('text')
        .text(function(d) {
            return d['description'];
        })
        .attr('class', function(d,i) {
            return 'label-' + i;
        })
        .attr('x', function(d) {
            var xVal = xScale(d['date']) - d['x-offset'];
            return isMobile ? (xVal - 10) : xVal;
        })
        .attr('y', function(d,i) {
            var yVal = yScale(d['num']) - d['y-offset'];
            return yVal;
        })
        .call(wrapText, eventLabelWidth, 13);

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

    var lineLabel = chartElement.append('g')
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
            .attr('class', function(d) {
                return 'label-' + classify(d['name']);
                console.log(d);
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var endValue = last[valueColumn];

                var label = fmtComma(last[valueColumn].toFixed(0));

                if (!isMobile) {
                    return label = d['name'] + ': $' + label;
                } else {
                    return '$' + fmtComma(endValue.toFixed(0));
                }
            });

        lineLabel.call(wrapText, 105, 14);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
