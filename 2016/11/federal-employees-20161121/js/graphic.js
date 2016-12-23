// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var years = [];

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
        d['date'] = d3.time.format('%Y').parse(d['date']);
        years.push(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
                d[key] = d[key] / 1000000;
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
        right: 118,
        bottom: 20,
        left: 55
    };

    var ticksX = 10;
    var ticksY = 6;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['left'] = 30;
        margins['right'] = 100;
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

    var max = 12;

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([ COLORS['teal1'], COLORS['teal2'], COLORS['teal3'], COLORS['teal4'], COLORS['teal5'] ]);

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
        // .ticks(ticksX)
        .tickValues(years)
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
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            } else {
                if (isMobile) {
                    return d.toFixed(0) + 'M';
                } else {
                    return d.toFixed(0) + ' million';
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
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return area(d['values']);
            });

    var value_g = area_g
        .append('g')
            .attr('class', 'value')
            .attr('transform', function(d,i) {
                var last = d['values'][d['values'].length - 1];
                var yPos = (yScale(last.y0 + last.y) + 10);
                if (i == 4) {
                    yPos -= 15;
                }
                return 'translate(' + (xScale(last[dateColumn]) + 6) + ', ' + yPos + ')';
            });

    value_g
        .append('text')
            .attr('class', 'label-top')
            .text(function(d, i) {
                var last = d['values'][d['values'].length - 1];
                label = d['name'];
                return label;
            });

    var y_offset = isMobile ? 10 : 13;
    var other_data = config['data'].slice(0, -5);
    var other_sum = d3.sum(other_data.map(function(d) {
        return d['values'][d['values'].length - 1][valueColumn];
    }));
    value_g
        .append('text')
            .attr('class', 'label-num')
            .text(function(d, i) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn].toFixed(2) + ' million';
                var year = fmtYearFull(last[dateColumn]);
                if (!isMobile) {
                    label = value + ' in ' + year;
                }
                return value;
            })
            .attr('transform', 'translate(0, ' + y_offset + ')');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
