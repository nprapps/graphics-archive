// Global vars
var pymChild = null;
var isMobile = false;
var dDataSeries = [];
var rDataSeries = [];
var dates = [];

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
    DATA_D.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);
        dates.push(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    DATA_R.forEach(function(d) {
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
    for (var column in DATA_D[0]) {
        if (column == 'date') {
            continue;
        }

        dDataSeries.push({
            'name': column,
            'values': DATA_D.map(function(d) {
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

    for (var column in DATA_R[0]) {
        if (column == 'date') {
            continue;
        }

        rDataSeries.push({
            'name': column,
            'values': DATA_R.map(function(d) {
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
        container: '#dem',
        width: containerWidth,
        data: dDataSeries,
        delsNeeded: 2383,
        max: 2500,
        party: 'dem',
        colorScale: [ COLORS['blue2'], COLORS['teal5'] ]
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
        right: 100,
        bottom: 20,
        left: 38
    };

    var ticksX = 10;
    var ticksY = 5;
    var roundTicksFactor = config['max'];
    var labelGap = 5;
    var annotationsLineHeight = 13;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 85;
        annotationsLineHeight = 9;
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
        .range(config['colorScale']);

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
        .ticks(ticksX)
        // .tickValues(dates)
        .tickFormat(function(d, i) {
            var fmtMMDD = d3.time.format('%m/%d');
            return fmtMMDD(d);

            // if (isMobile) {
            //     return '\u2019' + fmtYearAbbrev(d);
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

    // annotations
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');

    annotations.append('line')
        .attr('class', 'needed')
        .attr('x1', xScale(xScale.domain()[0]))
        .attr('y1', yScale(config['delsNeeded']))
        .attr('x2', xScale(xScale.domain()[1]))
        .attr('y2', yScale(config['delsNeeded']));

    annotations.append('text')
        .text(function() {
            // if (isMobile) {
            //     return 'Needed: ' + fmtComma(config['delsNeeded']);
            // } else {
                return 'Delegates needed: ' + fmtComma(config['delsNeeded']);
            // }
        })
        .attr('class', 'dels-needed')
        .attr('x', xScale(xScale.domain()[0]))
        .attr('y', yScale(config['delsNeeded']) - 6)
        .attr('dx', 0)
        .attr('dy', 0);
        // .call(wrapText, (margins['right'] - labelGap), annotationsLineHeight);

    var superTueLabel = annotations.append('text')
        .text('Super Tuesday')
        .attr('class', 'super-tue')
        .attr('x', xScale(config['data'][0]['values'][15]['date']))
        .attr('y', yScale(config['data'][0]['values'][15]['amt']) - 50)
        .attr('dx', 0)
        .attr('dy', 0)
        .call(wrapText, 50, annotationsLineHeight);

    var superTueBBox = superTueLabel.node().getBBox();

    annotations.append('line')
        .attr('class', 'super-tue')
        .attr('x1', xScale(config['data'][0]['values'][15]['date']))
        .attr('y1', superTueBBox.y + superTueBBox.height + 3)
        .attr('x2', xScale(config['data'][0]['values'][15]['date']))
        .attr('y2', yScale(config['data'][0]['values'][15]['amt']) - 5);

    if (config['party'] == 'dem') {
        var lastDataPoint = config['data'][0]['values'].length - 1;

        annotations.append('text')
            .text('Clinton, with supers: ' + fmtComma(TOTAL_CLINTON))
            .attr('class', 'with-supers clinton')
            .attr('x', xScale(xScale.domain()[1]) + labelGap)
            .attr('y', yScale(TOTAL_CLINTON) + 6)
            .attr('dx', 0)
            .attr('dy', 0)
            .call(wrapText, (margins['right'] - labelGap), annotationsLineHeight);

        annotations.append('line')
            .attr('class', 'with-supers clinton')
            .attr('x1', xScale(config['data'][0]['values'][lastDataPoint - 2]['date']))
            .attr('y1', yScale(TOTAL_CLINTON))
            .attr('x2', xScale(xScale.domain()[1]))
            .attr('y2', yScale(TOTAL_CLINTON))
            .attr('stroke', colorScale('Clinton'));

        annotations.append('text')
            .text('Sanders, with supers: ' + fmtComma(TOTAL_SANDERS))
            .attr('class', 'with-supers sanders')
            .attr('x', xScale(xScale.domain()[1]) + labelGap)
            .attr('y', function() {
                if (isMobile) {
                    return yScale(TOTAL_SANDERS) - 10;
                } else {
                    return yScale(TOTAL_SANDERS) - 16;
                }
            })
            .attr('dx', 0)
            .attr('dy', 0)
            .call(wrapText, (margins['right'] - labelGap), annotationsLineHeight);

        annotations.append('line')
            .attr('class', 'with-supers sanders')
            .attr('x1', xScale(config['data'][1]['values'][lastDataPoint - 2]['date']))
            .attr('y1', yScale(TOTAL_SANDERS))
            .attr('x2', xScale(xScale.domain()[1]))
            .attr('y2', yScale(TOTAL_SANDERS))
            .attr('stroke', colorScale('Sanders'));
    }

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
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + labelGap;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                if (d['name'] == 'Sanders') {
                    return yScale(last[valueColumn]) + 6;
                } else {
                    return yScale(last[valueColumn]);
                }
            })
            .attr('dx', 0)
            .attr('dy', 0)
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = fmtComma(last[valueColumn]);
                //
                // if (!isMobile) {
                    label = d['name'] + ': ' + label;
                // }

                return label;
            })
            .call(wrapText, (margins['right'] - labelGap), annotationsLineHeight);

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
