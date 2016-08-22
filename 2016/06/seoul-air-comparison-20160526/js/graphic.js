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
            } else if (d[key] == null) {
                d[key] = null;
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
            }).filter(function(d) {
                if (d['amt'] != null) {
                    return true;
                }
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
        top: 0,
        right: 85,
        bottom: 20,
        left: 82
    };

    var ticksX = 10;
    var ticksY = 8;
    var roundTicksFactor = 50;
    var valueLineHeight = 14;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 60;
        valueLineHeight = 12;
    }

    // Calculate actual chart dimensions
    // var chartWidth = Math.floor((config['width'] - margins['left'] - margins['right']) / (config['data'].length + 1)) * (config['data'].length + 1);
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    if (chartHeight > 350) {
        chartHeight = 350;
    }

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
        .domain([ 'New York City', 'Seoul' ])
        .range([ '#aaa', '#121212' ]);

    /*
     * Render the HTML legend.
     */
    // var legend = containerElement.append('ul')
    //     .attr('class', 'key')
    //     .selectAll('g')
    //     .data(config['data'])
    //     .enter().append('li')
    //         .attr('class', function(d, i) {
    //             return 'key-item ' + classify(d['name']);
    //         });
    //
    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return colorScale(d['name']);
    //     });
    //
    // legend.append('label')
    //     .text(function(d) {
    //         return d['name'];
        // });

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
                return formatAPDates(d);
            } else {
                return formatAPDates(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
		.tickValues([0, 50, 100, 150, 200])
		.tickFormat(function(d) {
			return d + " AQI";
		});

    /*
     * background bars for hazard ranges
     */

    var hazardRanges = chartElement.append('g')
        .attr('class', 'hazard-ranges');
    hazardRanges.append('rect')
        .attr('class', 'good bg')
        .attr('x', 0)
        .attr('y', yScale(50))
        .attr('width', chartWidth)
        .attr('height', (yScale(0) - yScale(50)));
    hazardRanges.append('rect')
        .attr('class', 'good axis-key')
        .attr('x', -48)
        .attr('y', yScale(50))
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('width', 44)
        .attr('height', 20);
    hazardRanges.append('text')
        .text('Good')
        .attr('x', -8)
		.attr('y', yScale(50) + 33);

    hazardRanges.append('rect')
        .attr('class', 'moderate bg')
        .attr('x', 0)
        .attr('y', yScale(100))
        .attr('width', chartWidth)
        .attr('height', (yScale(50) - yScale(100)));
    hazardRanges.append('rect')
        .attr('class', 'moderate axis-key')
        .attr('x', -53)
        .attr('y', yScale(100))
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('width', 49)
        .attr('height', 20);
    hazardRanges.append('text')
        .text('Moderate')
        .attr('x', -8)
		.attr('y', yScale(100) + 33);

    hazardRanges.append('rect')
        .attr('class', 'unhealthy-sensitive-groups bg')
        .attr('x', 0)
        .attr('y', yScale(150))
        .attr('width', chartWidth)
        .attr('height', (yScale(100) - yScale(150)));
    hazardRanges.append('rect')
        .attr('class', 'unhealthy-sensitive-groups axis-key')
        .attr('x', -53)
        .attr('y', yScale(150))
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('width', 49)
        .attr('height', 20);
    hazardRanges.append('text')
        .text('Unhealthy for sensitive groups')
        .attr('x', -8)
		.attr('y', yScale(150) + 33);

    hazardRanges.append('rect')
        .attr('class', 'unhealthy bg')
        .attr('x', 0)
        .attr('y', yScale(200))
        .attr('width', chartWidth)
        .attr('height', (yScale(150) - yScale(200)));
    hazardRanges.append('rect')
        .attr('class', 'unhealthy axis-key')
        .attr('x', -55)
        .attr('y', yScale(200))
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('width', 51)
        .attr('height', 20);
    hazardRanges.append('text')
        .text('Unhealthy')
        .attr('x', -8)
		.attr('y', yScale(200) + 33);

    hazardRanges.selectAll('text')
        .call(wrapText, (margins['left'] - 8), 12);

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

    chartElement.selectAll('.y.axis text')
        .attr('dy', function(d,i) {
            if (i > 0) {
                return 14;
            } else {
                console.log(d3.select(this));
                d3.select(this).attr('style', 'fill: #999');
            }
        });

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
        .interpolate('step-after')
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
            .attr('class', function(d, i) {
                return classify(d['name']);
            })
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 8;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })

            .text(function(d) {
                return d['name'] + ' average';
            })
            .call(wrapText, (margins['right'] - 8), valueLineHeight);
}

var formatAPDates = function(d) {
    var AP_MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

    return AP_MONTHS[d.getMonth()] + ' ' + d.getDate();
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
