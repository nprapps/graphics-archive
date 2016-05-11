// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

var TERM_BARS = [
    { 'begin': '1981', 'end': '1989' },
    { 'begin': '1993', 'end': '2001' },
    { 'begin': '2009', 'end': '2014' }
];

var TERM_LINES = [
    { 'style': 'reagan1', 'year': '1981' },
    { 'style': 'reagan2', 'year': '1985' },
    { 'style': 'hwbush', 'year': '1989' },
    { 'style': 'clinton1', 'year': '1993' },
    { 'style': 'clinton2', 'year': '1997' },
    { 'style': 'bush1', 'year': '2001' },
    { 'style': 'bush2', 'year': '2005' },
    { 'style': 'obama1', 'year': '2009' },
    { 'style': 'obama2', 'year': '2013' }
];

var TERM_LABELS = [
    { 'year': '1985', 'label': LABELS['annotation_1'] },
    { 'year': '1991', 'label': LABELS['annotation_3'] },
    { 'year': '1997', 'label': LABELS['annotation_4'] },
    { 'year': '2005', 'label': LABELS['annotation_6'] },
    { 'year': '2011', 'label': LABELS['annotation_8'] },
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
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
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
        top: 15,
        right: 50,
        bottom: 20,
        left: 43
    };

    var ticksX = 10;
    var ticksY = 8;
    var roundTicksFactor = 2000;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 32;
        margins['top'] = 30;
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
        .range([COLORS['teal3']]);

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
        .tickValues([d3.time.format('%Y').parse('1981'), d3.time.format('%Y').parse('1985'), d3.time.format('%Y').parse('1989'), d3.time.format('%Y').parse('1993'), d3.time.format('%Y').parse('1997'), d3.time.format('%Y').parse('2001'), d3.time.format('%Y').parse('2005'), d3.time.format('%Y').parse('2009'), d3.time.format('%Y').parse('2013') ])
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

    // term bars
    TERM_BARS.forEach(function(d,i) {
        chartElement.append('rect')
            .attr('class', 'bg')
            .attr('fill', '#f1f1f1')
            .attr('x', xScale(d3.time.format('%Y').parse(d['begin'])))
            .attr('width', xScale(d3.time.format('%Y').parse(d['end'])) - xScale(d3.time.format('%Y').parse(d['begin'])))
            .attr('y', 0)
            .attr('height', chartHeight);
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
    // var xAxisGrid = function() {
    //     return xAxis;
    // }

    var yAxisGrid = function() {
        return yAxis;
    }

    // chartElement.append('g')
    //     .attr('class', 'x grid')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxisGrid()
    //         .tickSize(-chartHeight, 0, 0)
    //         .tickFormat('')
    //     );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Add vert lines
     */
    TERM_LINES.forEach(function(d,i) {
        chartElement.append('line')
           .attr('class', 'x grid grid-' + d['style'])
           .attr('x1', xScale(d3.time.format('%Y').parse(d['year'])))
           .attr('x2', xScale(d3.time.format('%Y').parse(d['year'])))
           .attr('y1', yScale(yScale.domain()[0]))
           .attr('y2', yScale(yScale.domain()[1]));
    });

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
                var value = last[valueColumn];

                var label = fmtComma(last[valueColumn].toFixed(0));

                // if (!isMobile) {
                //     label = d['name'] + ': ' + label;
                // }

                return label;
            });

    // annotations
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');

    TERM_LABELS.forEach(function(d,i) {
        var y = -5;
        if (isMobile && (i % 2 == 1)) {
            y = -20;
        }

        annotations.append('text')
            .attr('class', 'label-top')
            .attr('x', xScale(d3.time.format('%Y').parse(d['year'])))
            .attr('dx', 0)
            .attr('text-anchor', 'middle')
            .attr('y', y)
            .html(d['label']);
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
