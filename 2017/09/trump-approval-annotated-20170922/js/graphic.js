// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var annotations = [];
var labelsToShift = []
var axisDates = [];

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
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

        if (d['date'].getDate() == 1) {
            axisDates.push(d['date']);
        }

        for (var key in d) {
            if (key != 'date' && key != 'annotations' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }

        if (d['annotations'] != null) {
            annotations.push(d);
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (column == 'date' || column == 'annotations') {
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

    _.each(LABEL_ADJUSTMENTS, function(d) {
        d['offset'] = +d['offset'];
    });

    labelsToShift = d3.keys(LABEL_ADJUSTMENTS);
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

    var aspectWidth = 9;
    var aspectHeight = isMobile? 45 : 18;
    var minHeight = 500;
    var annotLineHeight = isMobile ? 10 : 13;

    var margins = {
        top: 20,
        right: 46,
        bottom: 20,
        left: 240
    };

    var ticksX = 6;
    var ticksY = 20;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 3;
        ticksY = 10;
        margins['right'] = 43;
        margins['left'] = 140;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    //var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);
    if (chartHeight < minHeight) {
        chartHeight = minHeight;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    max = 0;

    var xScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ 0, chartWidth ]);

    var yDomain = d3.extent(config['data'][0]['values'], function(d) {
        return d['date'];
    });
    yDomain = yDomain.reverse();

    var yScale = d3.time.scale()
        .domain(yDomain)
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

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
        .tickFormat(function(d,i) {
            if (d == 0) {
                return d;
            }
            return d + ' pt.';
        });

    var xAxisTop = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d,i) {
            if (d == 0) {
                return d;
            }
            return d + ' pt.';
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('right')
        .tickValues(axisDates)
        .tickFormat(function(d, i) {
            return getAPMonth(d) + ' 1';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, 0))
        .call(xAxisTop);

    chartElement.append('g')
        .attr('class', 'y axis')
        .attr('transform', makeTranslate(chartWidth - 3, 0))
        .call(yAxis);

    chartElement.selectAll('.y.axis text')
        .attr('dy', '0.5em');

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
        .attr('transform', makeTranslate(chartWidth, 0))
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
            return xScale(d[valueColumn]);
        })
        .y(function(d) {
            return yScale(d[dateColumn]);
        });

    var area = d3.svg.area()
        .x1(function(d) {
            return xScale(d[valueColumn]);
        })
        .x0(xScale(0))
        .y(function(d) {
            return yScale(d[dateColumn]);
        });

    chartElement.append('g')
        .selectAll('path')
        .data(config['data'])
        .enter()
        .append('path')
            .attr('class', function(d) {
                return 'area ' + classify(d['name']);
            })
            .attr('d', function(d) {
                    return area(d['values']);
            });

    //chartElement.append('g')
        //.attr('class', 'lines')
        //.selectAll('path')
        //.data(config['data'])
        //.enter()
        //.append('path')
            //.attr('class', function(d, i) {
                //return 'line ' + classify(d['name']);
            //})
            //.attr('d', function(d) {
                //return line(d['values']);
            //});

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

                var label = last[valueColumn].toFixed(1);

                if (!isMobile) {
                    label = d['name'] + ': ' + label;
                }

                return label;
            });

/*
     * Annotations
     */
    // first, the text
    var annotatedText = chartWrapper.append('div')
        .attr('class', 'annot-text')
        .attr('style', function() {
            var s = '';
            s += 'top: ' + margins['top'] + 'px; ';
            s += 'width: ' + (margins['left'] - 9) + 'px; ';
            return s;
        });
    annotatedText.selectAll('div')
        .data(annotations)
        .enter().append('div')
            .attr('class', function(d) {
                return 'value ' + classify(formatFullDate(d[dateColumn]));
            })
            .html(function(d) {
                //if (isMobile) {
                    //return d['annotations'];
                //} else {
                    return '<strong>' + formatMonthDate(d[dateColumn]) + ':</strong> ' + d['annotations'];
                //}
            })
            .attr('style', function(d) {
                var s = '';
                var topPos = yScale(d['date']).toFixed(0) - 7;
                var thisAnnot = classify(formatFullDate(d[dateColumn]));
                //switch(thisAnnot) {
                    //case 'june-24-2016':
                        //topPos -= 43;
                        //break;
                    //case 'nov-22-2016':
                        //topPos -= 8;
                        //break;
                //}
                s += 'top: ' + topPos + 'px; ';
                return s;
            });

    // shift overlapping labels based on dates flagged in the spreadsheet
    _.each(labelsToShift, function(d,i) {
        if (LABEL_ADJUSTMENTS[d]['shift'] == 'both' || (isMobile && LABEL_ADJUSTMENTS[d]['shift'] == 'mobile') || (!isMobile && LABEL_ADJUSTMENTS[d]['shift'] == 'desktop')) {
            var iPrev = i-1;
            // var textPrev = document.getElementsByClassName(labelsToShift[iPrev]);
            // var textPrevBBox = textPrev[0].getBoundingClientRect();
            var prevText = annotatedText.select('.' + labelsToShift[iPrev]);
            var prevTextHeight = prevText.node().getBoundingClientRect().height;
            var prevTextY = parseInt(prevText.style('top'));
            var spacer = 7;
            if (isMobile) {
                spacer = 4;
            }
            annotatedText.select('.' + d).style('top', (prevTextY + prevTextHeight + spacer) + 'px');
        }
    });

    // now the dots and lines
    var annotatedPoints = chartElement.append('g')
        .attr('class', 'annotations');

    _.each(annotations, function(d, i) {
        var thisID = classify(formatFullDate(d['date']));
        var isSpecial = false;
        if (_.contains(labelsToShift, thisID)) {
            isSpecial = true;
        };

        var thisPoint = annotatedPoints.append('g')
            .attr('class', 'annot ' + thisID);

        // draw the pointer line
        if (!isSpecial) {
            // no fanciness needed for blurbs directly in line with their respective dots
            thisPoint.append('line')
                .attr('x1', xScale(d['net negative']))
                .attr('x2', -5)
                .attr('y1', yScale(d['date']).toFixed(0))
                .attr('y2', yScale(d['date']).toFixed(0));
        } else {
            // otherwise, the fun begins. pointer PATHS rather than simple lines.
            console.log(d);
            var thisLabel = annotatedText.select('.' + thisID);
            var thisStartX = xScale(d['net negative']);
            var thisStartY = yScale(d['date']).toFixed(0);
            var thisEndX = 0;
            var thisEndY = parseInt(thisLabel.style('top')) + 7;
            var offsetIncrement = -10;
            if (isMobile) {
                offsetIncrement = -5;
            }
            var thisOffset = LABEL_ADJUSTMENTS[thisID]['offset'] * offsetIncrement;
            var thisFullWidth = thisEndX - thisStartX;

            var linePoints = [
                { 'x': -5, 'y': thisEndY },
                { 'x': thisEndX, 'y': thisEndY },
                { 'x': (thisStartX + thisFullWidth - thisOffset), 'y': thisEndY },
                { 'x': (thisStartX + thisFullWidth - thisOffset), 'y': thisStartY },
                { 'x': thisStartX, 'y': thisStartY }
            ];

            var line = d3.svg.line()
                .x(function(d) { return d.x; })
                .y(function(d) { return d.y; })
                .interpolate('linear');

            thisPoint.append('path')
                .attr('d', line(linePoints));
        }

        // finally, the dots
        thisPoint.append('circle')
            .attr('cx', xScale(d['net negative']))
            .attr('cy', yScale(d['date']))
            .attr('r', isMobile ? 3 : 4);
    });

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
