// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;
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
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'label_17' && key != 'label_16' && key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (column == 'date' || column == 'label_17' || column == 'label_16') {
            continue;
        }

        var year_val = column.split('-')[1];

        dataSeries.push({
            'name': column,
            'values': DATA.map(function(d) {
                return {
                    'column': column,
                    'label': d['label_' + year_val],
                    'date': d['date'],
                    'amt': d[column]
                };
    // filter out empty data. uncomment this if you have inconsistent data.
    //        }).filter(function(d) {
    //            return d['amt'] != null;
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

    if (containerWidth <= 240) {
        isSidebar = true;
        isMobile = true;
    } else if (containerWidth <= MOBILE_THRESHOLD) {
        isSidebar = false;
        isMobile = true;
    } else {
        isSidebar = false;
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

    var aspectWidth = isSidebar ? 4 : isMobile ? 4 : 16;
    var aspectHeight = isSidebar ? 5 : isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: isSidebar ? 47 : 57,
        bottom: 20,
        left: 25
    };

    var ticksX = 3;
    var ticksY = 5;
    var roundTicksFactor = 1000000;

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
        .range(['#aaa', COLORS['red3']]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
        .data(config['data'])
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item ' + classify(d['name']);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d['name']);
        });

    legend.append('label')
        .text(function(d) {
            return d['name'];
        });

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
            return getAPMonth(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d === 0) {
                return '';
            } else {
                return (d / 1000000) + 'M';
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
        //.interpolate('monotone')
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

    var dotGroup = chartElement.selectAll('g.dot-group')
        .data(config['data'])
            .enter()
        .append('g')
            .attr('fill', function(d) {
                return colorScale(d['name']);
            })
            .attr('class', function(d) {
                return 'dot-group group-' + classify(d['name']);
            });

    var dots = dotGroup.selectAll('circle')
        .data(function(d) {
            return d['values'];
        }).enter()
        .append('circle')
            .attr('r', 4)
            .attr('cx', function(d) { return xScale(d['date']); })
            .attr('cy', function(d) { return yScale(d[valueColumn]); })

    var dotLabels = dotGroup.selectAll('g.dot-label')
        .data(function(d) {
            return d['values'];
        }).enter()
        .append('g')
            .attr('class', 'dot-label');

    dotLabels.append('text')
        .text(function(d) {
            if (d['label']) {
                var dateFormat = d['label'];
                return dateFormat + ':';
            } else {
                var numFormat = (d[valueColumn] / 1000000).toFixed(1);
                return numFormat;
            }
        })
        .attr('x', function(d) { return xScale(d['date']); })
        .attr('y', function(d,i) { 
            if (d['column'] == '2015-16') {
                if (i == 0) {
                    var offset = 20;
                } else if (d['label']) {
                    var offset = -20;
                } else {
                    var offset = -8;
                }
            } else {
                if (i == 0) {
                    var offset = -40;
                } else {
                    var offset = 20;
                }
            }
            return yScale(d[valueColumn]) + offset;
        });

    dotLabels.append('text')
        .text(function(d) {
            if (d['label']) {
                var numFormat = (d[valueColumn] / 1000000).toFixed(1) + ' million';
                return numFormat;
            } else {
                return '';
            }
        })
        .attr('x', function(d) { return xScale(d['date']); })
        .attr('y', function(d,i) { 
            if (d['column'] == '2015-16') {
                if (i == 0) {
                    var offset = 20;
                } else if (d['label']) {
                    var offset = -20;
                } else {
                    var offset = -8;
                }
            } else {
                if (i == 0) {
                    var offset = -40;
                } else {
                    var offset = 20;
                }
            }
            return yScale(d[valueColumn]) + offset;
        })
        .attr('dy', 13);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
