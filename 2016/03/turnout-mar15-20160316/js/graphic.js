// Global vars
var pymChild = null;
var isMobile = false;
var dataSeriesD = [];
var dataSeriesR = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData(DATA_D, 'd');
        formatData(DATA_R, 'r');

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
var formatData = function(data, party) {
    data.forEach(function(d) {
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
    var dataSeries = [];
    for (var column in data[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': data.map(function(d) {
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

    switch(party) {
        case 'd':
            dataSeriesD = dataSeries;
            break;
        case 'r':
            dataSeriesR = dataSeries;
            break;
    }
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    // Render the chart!
    var gopChart = containerElement.append('div')
        .attr('class', 'chart-wrapper')
        .attr('id', 'rep');

    gopChart.append('h3')
        .text('Republican Turnout');

    renderLineChart({
        container: '#rep',
        width: graphicWidth,
        data: dataSeriesR,
        domain: [ 0, 2500000 ],
        party: 'r'
    });

    var demChart = containerElement.append('div')
        .attr('class', 'chart-wrapper')
        .attr('id', 'dem');

    demChart.append('h3')
        .text('Democratic Turnout');

    renderLineChart({
        container: '#dem',
        width: graphicWidth,
        data: dataSeriesD,
        domain: [ 0, 2500000 ],
        party: 'd'
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

    var aspectWidth = isMobile ? 1 : 1;
    var aspectHeight = isMobile ? 1.5 : 2.3;

    // var aspectWidth = 1;
    // var aspectHeight = 1.5;
    //
    var margins = {
        top: 5,
        right: 110,
        bottom: 20,
        left: 57
    };

    var isPromo = false;
    if (isPromo) {
        aspectHeight = 1.7;
    }

    var tickValues = [ d3.time.format('%Y').parse('2008'),
                       d3.time.format('%Y').parse('2012'),
                       d3.time.format('%Y').parse('2016') ];
    var ticksY = 5;
    var roundTicksFactor = 100000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain(config['domain'])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'));

    switch(config['party']) {
        case 'd':
            // colorScale.range([ COLORS['blue1'], COLORS['blue2'], COLORS['blue3'], COLORS['blue4'] ]);
            colorScale.range([ COLORS['blue3'], COLORS['blue2'], COLORS['blue1'], COLORS['blue4'], COLORS['blue5']]);
            break;
        case 'r':
            colorScale.range([ COLORS['red2'], COLORS['red1'], COLORS['red3'], COLORS['red4'], COLORS['red5']]);
            break;
    }

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
    //     });

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
        .tickValues(tickValues)
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
    var line = d3.svg.line()
//        .interpolate('monotone')
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

    var valueDots = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('g')
        .data(config['data'])
        .enter().append('g')
            .attr('class', function(d) {
                return classify(d['name']);
            });

    valueDots.selectAll('circle')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('circle')
            .attr('cx', function(d) {
                return xScale(d['date']);
            })
            .attr('cy', function(d) {
                return yScale(d['amt']);
            })
            .attr('r', 3)
            .attr('fill', function(d) {
                var st = d3.select(this.parentNode).attr('class');
                return colorScale(st);
            });

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 10;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];
                if (d['name'] == 'Ohio') {
                    return yScale(last[valueColumn]) - 1;
                } if (d['name'] == 'N.C.') {
                    return yScale(last[valueColumn]) + 5;
                }
                    return yScale(last[valueColumn]) + 3;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = fmtComma(last[valueColumn].toFixed(0));
                return d['name'] + ': ' + label;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
