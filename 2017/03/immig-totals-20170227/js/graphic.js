// Global vars
var MMEDIA_THRESHOLD = 730;
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values' ];

/*
 * Initialize the graphic.
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
        var x0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (_.contains(skipLabels, key)) {
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];

            d['values'].push({
                'name': key,
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })

            x0 = x1;
        }
    });

    _.each(ANNOTATIONS, function(d,i) {
        d['pct'] = +d['pct'];
        d['amt'] = +d['amt'];
    });
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

    var graphicWidth = containerWidth;
    if (containerWidth >= MMEDIA_THRESHOLD) {
        graphicWidth = 650;
    }

    // Render the chart!
    renderStackedBarChart({
        container: '#stacked-bar-chart',
        width: graphicWidth,
        data: DATA
    });

    renderColumnChart({
        container: '#bar-chart',
        width: graphicWidth,
        data: ANNOTATIONS
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 22;
    var barGap = 5;
    // var labelWidth = 0;
    // var labelMargin = 0;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 0,
        bottom: 30,
        left: 0
    };

    var ticksX = 4;
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksX = 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        var lastValue = d['values'][d['values'].length - 1];
        return Math.floor(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
     });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        var lastValue = d['values'][d['values'].length - 1];
        return Math.ceil(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
    });

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

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
     * Render bars to chart.
     */
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d[labelColumn]);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }

                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .attr('class', function(d) {
                 return classify(d['name']);
             });

    /*
     * Render bar labels.
     */
    var annot = chartElement.append('g')
        .attr('class', 'annotations');

    annot.append('text')
        .attr('class', 'lawful')
        .text('Authorized immigrants: 74.5%')
        .attr('x', 0)
        .attr('y', chartHeight + 23)
        .call(wrapText, chartWidth * .45, 11);

    annot.append('text')
        .attr('class', 'unauthorized')
        .text('Unauthorized immigrants: 25.5%')
        .attr('x', chartWidth)
        .attr('y', chartHeight + 23)
        .attr('text-anchor', 'end')
        .call(wrapText, chartWidth * .45, 11);

    chartElement.selectAll('text')
        .attr('dy', function() {
            var bbox = d3.select(this).node().getBBox();
            if ((bbox.height + 10) > margins['bottom']) {
                margins['bottom'] = bbox.height + 15;
                chartWrapper.select('svg').attr('height', (chartHeight + margins['top'] + margins['bottom']));
            }
            return 0;
        });

    // connector lines
    var line = d3.svg.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .interpolate('linear');

    var lawfulStart = 5;
    var lawfulEnd = config['data'][0]['values'][2]['x1'];
    var unlawfulStart = config['data'][0]['values'][3]['x0'];
    var unlawfulEnd = config['data'][0]['values'][3]['x1'];

    var points = {
        'lawful': [
            { 'x': lawfulStart, 'y': barHeight },
            { 'x': lawfulStart, 'y': barHeight + 7 },
            { 'x': xScale(lawfulEnd) - 5, 'y': barHeight + 7 },
            { 'x': xScale(lawfulEnd) - 5, 'y': barHeight }
        ],
        'unlawful': [
            { 'x': xScale(unlawfulStart) + 5, 'y': barHeight },
            { 'x': xScale(unlawfulStart) + 5, 'y': barHeight + 7 },
            { 'x': xScale(unlawfulEnd) - 5, 'y': barHeight + 7 },
            { 'x': xScale(unlawfulEnd) - 5, 'y': barHeight }
        ]
    }

    annot.append('path')
        .attr('d', line(points['lawful']));
    annot.append('line')
        .attr('x1', 22)
        .attr('x2', 22)
        .attr('y1', barHeight + 7)
        .attr('y2', barHeight + 15);

    annot.append('path')
        .attr('d', line(points['unlawful']));
    annot.append('line')
        .attr('x1', xScale(((unlawfulEnd - unlawfulStart) / 2) + unlawfulStart))
        .attr('x2', xScale(((unlawfulEnd - unlawfulStart) / 2) + unlawfulStart))
        .attr('y1', barHeight + 7)
        .attr('y2', barHeight + 15);
}


/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var aspectWidth = 3;
    var aspectHeight = 1;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 0,
        bottom: 20,
        left: 57
    };

    var ticksY = 6;
    var roundTicksFactor = 5;

    if (isMobile) {
        margins['left'] = 0;
        margins['top'] = 0;
        roundTicksFactor = 1;
        ticksY = 3;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

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
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], .09)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (!isMobile) {
                if (d == 0) {
                    return d;
                } else {
                    return d + ' million';
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

    chartElement.selectAll('.x.axis text')
        .attr('y', 18)
        .attr('dy', 0)
        .call(wrapText, xScale.rangeBand(), 12)
        .attr('dy', function() {
            var bbox = d3.select(this).node().getBBox();
            if ((bbox.height + 18) > margins['bottom']) {
                margins['bottom'] = bbox.height + 18;
                chartWrapper.select('svg').attr('height', (chartHeight + margins['top'] + margins['bottom']));
            }
            return 0;
        });

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                return xScale(d[labelColumn]);
            })
            .attr('y', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(0);
                }

                return yScale(d[valueColumn]);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(d[valueColumn]) - yScale(0);
                }

                return yScale(0) - yScale(d[valueColumn]);
            })
            .attr('class', function(d, i) {
                return 'bar bar-' + i + ' ' + classify(d[labelColumn]);
            });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d, i) {
                return d['amt_verbose'];
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dy', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = 0;

                if (d[valueColumn] < 0) {
                    barHeight = yScale(d[valueColumn]) - yScale(0);

                    if (textHeight + valueGap * 2 < barHeight) {
                        d3.select(this).classed('in', true);
                        return -(textHeight - valueGap / 2);
                    } else {
                        d3.select(this).classed('out', true)
                        return textHeight + valueGap;
                    }
                } else {
                    barHeight = yScale(0) - yScale(d[valueColumn]);

                    if (textHeight + valueGap * 2 < barHeight) {
                        d3.select(this).classed('in', true)
                        return textHeight + valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return -(textHeight - valueGap / 2);
                    }
                }
            })
            .attr('text-anchor', 'middle');
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
