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
        right: 20,
        bottom: 20,
        left: 50
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 50;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        roundTicksFactor = 100;
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
        .domain(d3.extent(config['data'][1]['values'], function(d) {
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
        .range([ COLORS['blue3'], COLORS['orange3'] ]);

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
            var fmtMonthYear = d3.time.format('%m/%Y');

            return fmtMonthYear(d);
            // if (isMobile) {
            //     return '\u2019' + fmtMonthYear(d);
            // } else {
            //     return fmtYearFull(d);
            // }
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
     * filled area for reservoir volume
     */
    var area = d3.svg.area()
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y0(chartHeight)
        .y1(function(d) {
            return yScale(d[valueColumn]);
        });


    chartElement.append('g')
        .attr('class', 'area')
        .selectAll('path')
        .data(config['data'].filter(function(d,i) {
            return d['name'] == 'Storage';
        }))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'area ' + classify(d['name']);
            })
            .attr('d', function(d) {
                return area(d['values']);
            });

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        // .interpolate('monotone')
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

    // chartElement.append('g')
    //     .attr('class', 'value')
    //     .selectAll('text')
    //     .data(config['data'])
    //     .enter().append('text')
    //         .attr('x', function(d, i) {
    //             var last = d['values'][d['values'].length - 1];
    //
    //             return xScale(last[dateColumn]) + 5;
    //         })
    //         .attr('y', function(d) {
    //             var last = d['values'][d['values'].length - 1];
    //
    //             return yScale(last[valueColumn]) + 3;
    //         })
    //         .text(function(d) {
    //             var last = d['values'][d['values'].length - 1];
    //             var value = last[valueColumn];
    //
    //             var label = last[valueColumn].toFixed(1);
    //
    //             if (!isMobile) {
    //                 label = d['name'] + ': ' + label;
    //             }
    //
    //             return label;
    //         });

    var annotations = chartElement.append('g')
        .attr('class', 'annotations');
    annotations.append('text')
        .text('Billions of gallons')
        .attr('transform', 'translate(' + (-margins['left'] + 11) + ', ' + ((chartHeight / 2) + margins['top']) + ') rotate(-90)')
        .attr('class', 'axis-label');

    console.log(config['data']);
    annotations.append('text')
        .text('Storage limit')
        .attr('transform', 'translate(6, ' + (yScale(config['data'][1]['values'][0]['amt']) - 6) + ')')
        .attr('class', 'line-label title');

    var storageDataLength = config['data'][0]['values'].length - 1;
    annotations.append('text')
        .text('Current storage (March 17):')
        .attr('x', xScale(config['data'][0]['values'][storageDataLength]['date']) + 3)
        .attr('y', yScale(config['data'][0]['values'][storageDataLength]['amt']) - 70)
        .attr('class', 'line-label title storage')
        .attr('dx', 0)
        .attr('dy', 0)
        .call(wrapText, 100, 14);

    annotations.append('text')
        .text(config['data'][0]['values'][storageDataLength]['amt'].toFixed(1) + ' billion gallons')
        .attr('x', xScale(config['data'][0]['values'][storageDataLength]['date']) + 3)
        .attr('y', yScale(config['data'][0]['values'][storageDataLength]['amt']) - 40)
        .attr('class', 'line-label storage')
        .attr('dx', 0)
        .attr('dy', 0)
        .call(wrapText, 60, 14);

    annotations.append('circle')
        .attr('cx', xScale(config['data'][0]['values'][storageDataLength]['date']))
        .attr('cy', yScale(config['data'][0]['values'][storageDataLength]['amt']))
        .attr('r', 2)
        .attr('fill', colorScale.range()[0]);

    annotations.append('line')
        .attr('x1', xScale(config['data'][0]['values'][storageDataLength]['date']))
        .attr('x2', xScale(config['data'][0]['values'][storageDataLength]['date']))
        .attr('y1', yScale(config['data'][0]['values'][storageDataLength]['amt']) - 22)
        .attr('y2', yScale(config['data'][0]['values'][storageDataLength]['amt']))
        .attr('class', 'pointer');
}

/*
 * Wrap a block of text to a given width
 * via http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = parseFloat(text.attr('dx'));
        var dy = parseFloat(text.attr('dy'));

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
