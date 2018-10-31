// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

// adjusted begin date 1990-07-01
var recession_dates = [
    { 'begin': '1991-01-01', 'end': '1991-03-01' },
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
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    recession_dates.forEach(function(d) {
        d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
        d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
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
                    'amt': d[column]                };
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

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 40,
        right: 32,
        bottom: 20,
        left: 60
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 300000;

    // Mobile
    if (isMobile) {
        ticksX = 8;
        ticksY = 5;
        margins.left = 35;
        roundTicksFactor = 500000;
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


    var min0 = d3.min([config['data'][0]], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var min1 = d3.min([config['data'][1]], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (min0 > 0) {
        min0 = 0;
    }
    if (min1 > 0) {
        min1 = 0;
    }

    var max0 = d3.max([config['data'][0]], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });


    var max1 = d3.max([config['data'][1]], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn]);
        })
    });

    var yScale0 = d3.scale.linear()
        .domain([min0, max0])
        .range([chartHeight, 0]);

    var yScale1 = d3.scale.linear()
        .domain([min1, max1])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['blue4'], COLORS['orange3']]);

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
            return '\u2019' + fmtYearAbbrev(d);
        });

    var yAxis0 = d3.svg.axis()
        .scale(yScale0)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function (d) {
            if (isMobile) {
                return fmtNumSIMillions(d, true);
            }
            return fmtNumSIMillions(d, false);
        });

    var yAxis1 = d3.svg.axis()
        .scale(yScale1)
        .orient('right')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d + '%';
        });

    /*
     * Render axes to chart.
     */
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

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .attr('id', 'apprehensions')
        .call(yAxis0);

    chartElement.append('g')
        .attr('class', 'y axis')
        .attr('id', 'unemployment')
        .attr('transform', makeTranslate(chartWidth, 0))
        .call(yAxis1);


    /*
     * Render axis labels to chart
     */
     chartElement.append('text')
        .attr('class', 'y1-text')
        .attr('text-anchor', 'middle')
        .attr('transform', makeTranslate(chartWidth-35, -25))
        .text('Unemployment rate');

    if (!isMobile) {
        chartElement.append('text')
            .attr('class', 'y0-text')
            .attr('text-anchor', 'middle')
            .attr('transform', makeTranslate(-10, -25))
            .text('Apprehensions');
    } else {
        chartElement.append('text')
            .attr('class', 'y0-text')
            .attr('text-anchor', 'middle')
            .attr('transform', makeTranslate(16, -25))
            .text('Apprehensions');
    }



    /*
     * Render 0 value line.
     */
    if (min0 < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale0(0))
            .attr('y2', yScale0(0));
    }

    /*
     * Render lines to chart.
     */
    var line0 = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale0(d[valueColumn]);
        });

    var line1 = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale1(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data([config['data'][0]])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return line0(d['values']);
            });

    chartElement.append('g')
        .attr('class', 'value')
        .attr('id', 'apprehensions')
        .selectAll('text')
        .data([config['data'][0]])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale0(last[valueColumn]) + 3;
            });


    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data([config['data'][1]])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return line1(d['values']);
            });

    chartElement.append('g')
        .attr('class', 'value')
        .attr('id', 'unemployment')
        .selectAll('text')
        .data([config['data'][1]])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale1(last[valueColumn]) + 3;
            });

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
