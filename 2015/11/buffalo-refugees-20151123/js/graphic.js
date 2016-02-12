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
        top: 5,
        right: 105,
        bottom: 20,
        left: 40
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
    }

    var index_cutoff = config['data'].length - 6;

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

    //var max = d3.max(config['data'], function(d) {
        //return d3.sum(d['values'], function(v) {
            //return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        //});
    //});
    var max = 1600;

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['teal3'], COLORS['orange3']]);

    /*
     * Render the HTML legend.
     */
    var legend_data = config['data'].slice(-6);
    legend_data.reverse();
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
        .data(legend_data)
        .enter().append('li')
            .attr('class', function(d, i) {
                if (i == 5) {
                    return 'key-item other';
                }
                return 'key-item ' + classify(d['name']);
            });

    legend.append('b')
        .style('background-color', function(d,i) {
            if (i ==5) {
                return '#ccc';
            }
            return colorScale(d['name']);
        });

    legend.append('label')
        .text(function(d,i) {
            if (i == 5) {
                return 'Other nationalities';
            }
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
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

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
            return yScale(d.y0);
        })
        .y1(function(d) {
            return yScale(d.y0 + d[valueColumn]);
        });

    var stack = d3.layout.stack()
        .values(function(d) { return d.values; })
        .x(function(d) {
            return d[dateColumn];
        })
        .y(function(d) {
            return d[valueColumn];
        });

    var areas = stack(config['data']);

    var area_g = chartElement.append('g')
        .attr('class', 'areas')
        .selectAll('.area-g')
            .data(areas)
                .enter()
                .append('g')
                    .attr('class', 'area-g');

    area_g
        .append('path')
            .attr('class', function(d, i) {
                return 'area ' + classify(d['name']);
            })
            .attr('fill', function(d,i) {
                if (i > index_cutoff) {
                    return colorScale(d['name']);
                } else {
                    return '#ccc';
                }
            })
            .attr('d', function(d) {
                return area(d['values']);
            });

    var value_g = area_g
        .append('g')
            .attr('class', 'value')
            .attr('transform', function(d,i) {
                var last = d['values'][d['values'].length - 1];
                return 'translate(' + (xScale(last[dateColumn]) + 3) + ', ' + (yScale(last.y0 + last.y) + 10) + ')';
            });

    if (!isMobile) {
        value_g
            .append('text')
                .text(function(d, i) {
                    if (i > index_cutoff) {
                        var last = d['values'][d['values'].length - 1];
                        label = d['name'];
                        return label;
                    } else if (i == index_cutoff) {
                        return 'Other countries';
                    }
                });
    }

    var y_offset = isMobile ? 0 : 11;
    var other_data = config['data'].slice(0, -5);
    var other_sum = d3.sum(other_data.map(function(d) {
        return d['values'][d['values'].length - 1][valueColumn];
    }));
    value_g
        .append('text')
            .attr('class', 'label-num')
            .text(function(d, i) {
                if (i > index_cutoff) {
                    var last = d['values'][d['values'].length - 1];
                    var value = last[valueColumn];
                    var label = parseInt(last[valueColumn], 10);
                    if (!isMobile) {
                        label = label + ' in 2015';
                    }
                    return label;
                } else if (i == index_cutoff) {
                    var label = parseInt(other_sum, 10);
                    if (!isMobile) {
                        label = label + ' in 2015';
                    }
                    return label;
                }
            })
            .attr('transform', 'translate(0, ' + y_offset + ')');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

