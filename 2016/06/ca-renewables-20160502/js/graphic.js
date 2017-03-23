// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var usageData = [];

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
        for (var key in d) {
            if (key != 'hour' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
                d[key] = d[key] / 1000;
            }
        }
        usageData.push({ 'hour': d['hour'],  'Usage': d['Usage'] });
        delete d['Usage'];
    });

    // console.log(DATA);
    // console.log(usageData);

    /*
     * Restructure tabular data for easier charting.
     */
    // for (var column in DATA[0]) {
    //     if (column == 'hour') {
    //         continue;
    //     }
    //
    //     dataSeries.push({
    //         'name': column,
    //         'values': DATA.map(function(d) {
    //             return {
    //                 'hour': d['hour'],
    //                 'amt': d[column]
    //             };
    // // filter out empty data. uncomment this if you have inconsistent data.
    // //        }).filter(function(d) {
    // //            return d['amt'].length > 0;
    //         })
    //     });
    // }

    dataSeries = DATA;
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
    var dateColumn = 'hour';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 75,
        bottom: 20,
        left: 45
    };

    var ticksX = [ '1 a.m.', '4 a.m.', '7 a.m.', '10 a.m.', '1 p.m.', '4 p.m.', '7 p.m.', '10 p.m.' ];
    var ticksY = 8;
    var roundTicksFactor = 2;

    // Mobile
    if (isMobile) {
        ticksY = 5;
        margins['top'] = 15;
        margins['right'] = 60;
        ticksX = [ '12 a.m.', '6 a.m.', '12 p.m.', '6 p.m.' ];
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'hour'))
        .rangePoints([ 0, chartWidth ]);

    // var min = d3.min(config['data'], function(d) {
    //     return d3.min(d['values'], function(v) {
    //         return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
    //     })
    // });
    var min = 0;

    // if (min > 0) {
    //     min = 0;
    // }
    //
    // var max = d3.max(config['data'], function(d) {
    //     return d3.max(d['values'], function(v) {
    //         return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
    //     })
    // });
    var max = 25;

    var yScale = d3.scale.linear()
        .domain([ min, max ])
        .range([chartHeight, 0]);

    var keys = d3.keys(config['data'][0]).filter(function(d) {
        return d != dateColumn;
    });

    var colorScale = d3.scale.ordinal()
        .domain(keys)
        .range([ COLORS['blue1'], COLORS['blue2'], COLORS['blue3'], COLORS['blue4'], COLORS['blue5'], COLORS['orange3'], COLORS['orange5'], COLORS['red3'] ]);

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
        .tickValues(ticksX);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d,i) {
            if (d == max) {
                return d + ' GW';
            } else {
                return d;
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
    var area = d3.svg.area()
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y0(function(d) {
            return yScale(d['y0']);
        })
        .y1(function(d) {
            return yScale(d['y0'] + d['y']);
        });

    var stack = d3.layout.stack()
        .values(function(d) {
            return d['values'];
        });

    var sourceData = stack(colorScale.domain().map(function(name) {
        return {
            name: name,
            values: config['data'].map(function(d) {
                return {
                    hour: d[dateColumn],
                    y: d[name]
                };
            })
        };
    }));

    var energySource = chartElement.append('g')
        .attr('class', 'areas')
        .selectAll('path')
        .data(sourceData)
        .enter()
            .append('g')
                .attr('class', 'energy-source');

    energySource.append('path')
        .attr('class', 'area')
        .attr('d', function(d) {
            return area(d['values']);
        })
        .style('fill', function(d) {
            return colorScale(d['name']);
        })

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(sourceData)
        .enter().append('text')
            .attr('x', function(d) {
                switch(d['name']) {
                    case 'Solar':
                        return xScale('11 a.m.');
                        break;
                    case 'Excess power':
                        return xScale('2 p.m.');
                        break;
                    default:
                        return chartWidth;
                        break;
                }
            })
            .attr('y', function(d) {
                var v = null;
                var yPos = null;

                switch (d['name']) {
                    case 'Solar':
                        v = 12;
                        yPos = d['values'][v];
                        return yScale((yPos['y'] / 2) + yPos['y0']);
                        break;
                    case 'Excess power':
                        v = 12;
                        yPos = d['values'][v];
                        return yScale(yPos['y'] + yPos['y0']);
                        break;
                    default:
                        v = d['values'].length - 1;
                        yPos = d['values'][v];
                        return yScale((yPos['y'] / 2) + yPos['y0']);
                        break;
                }
            })
            .attr('dx', function() {
                if (isMobile) {
                    return 6;
                } else {
                    return 10;
                }
            })
            .attr('dy', function(d) {
                if (d['name'] == 'Excess power') {
                    return -13;
                } else {
                    return 3;
                }
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .text(function(d) {
                return d['name'];
            });

    // usage line
    var line = d3.svg.line()
        // .interpolate('monotone')
        .x(function(d) {
            // console.log(d);
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d['Usage']);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .append('path')
        .attr('class', 'line usage')
        .attr('d', line(usageData));

    chartElement.select('g.value')
        .append('text')
        .attr('x', chartWidth)
        .attr('y', function(d) {
            var v = usageData.length - 1;
            return yScale(usageData[v]['Usage']);
        })
        .attr('dx', function() {
            if (isMobile) {
                return 6;
            } else {
                return 10;
            }
        })
        .attr('dy', function() {
            if (isMobile) {
                return 0;
            } else {
                return 3;
            }
        })
        .attr('class', 'usage')
        .text('Usage');
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
