// Global vars
var pymChild = null;
var isMobile = false;

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
        for (var key in d) {
            if (key == 'label') {
                continue;
            }
            d[key] = +d[key];
        }
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

    // Render the chart!
    renderDotChart({
        container: '#dot-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 */
var renderDotChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var categories = d3.keys(config['data'][0]).filter(function(d) {
        return d != 'label';
    });

    var barHeight = 50;
    var barGap = 5;
    // var labelWidth = 135;
    var labelWidth = 120;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;

    var margins = {
        top: 35,
        right: 12,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;

    if (isMobile) {
        // labelWidth = 90;
        // barHeight = 40;
        // margins['left'] = labelWidth + labelMargin;
        // margins['right'] = 10;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Color scale
     */
    var colorScale = d3.scale.ordinal()
        .domain(categories)
        .range([ COLORS['red3'], COLORS['orange3'] ]);

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
    var min = 0;
    var max = 50;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d,i) {
            return d + '%';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render range bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', function(d, i) {
                return xScale(0);
            })
            .attr('x2', function(d, i) {
                return xScale(d[colorScale.domain()[1]]);
            })
            .attr('y1', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('y2', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            });

    chartElement.append('g')
        .attr('class', 'bars range')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', function(d, i) {
                return xScale(d[colorScale.domain()[1]]);
            })
            .attr('x2', function(d, i) {
                return xScale(d[colorScale.domain()[0]]);
            })
            .attr('y1', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('y2', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            });

    /*
     * Render dots to chart.
     */
    categories.forEach(function(c) {
        chartElement.append('g')
            .attr('class', 'dots ' + classify(c))
            .selectAll('circle')
            .data(config['data'])
            .enter().append('circle')
                .attr('cx', function(d, i) {
                    return xScale(d[c]);
                })
                .attr('cy', function(d, i) {
                    return i * (barHeight + barGap) + (barHeight / 2);
                })
                .attr('r', dotRadius)
                .attr('fill', function(d) {
                    return colorScale(c);
                });
    })

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'width': labelWidth + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap)) + 'px;'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
                });

    /*
     * Render bar values.
     */
    categories.forEach(function(c, k) {
        chartElement.append('g')
            .attr('class', 'value category ' + classify(c))
            .selectAll('text')
            .data(config['data'].filter(function(d, i) {
                return i == 0;
            }))
            .enter().append('text')
                .attr('x', function(d, i) {
                    return xScale(d[c]);
                })
                .attr('y', -26)
                .attr('fill', colorScale(c))
                .text(function(d, i) {
                    return c + ':';
                })
                .call(wrapText, 80, 13);

        chartElement.append('g')
            .attr('class', 'value shadow ' + classify(c))
            .selectAll('text')
            .data(config['data'])
            .enter().append('text')
                .attr('x', function(d, i) {
                    return xScale(d[c]);
                })
                .attr('y', function(d,i) {
                    return i * (barHeight + barGap) + (barHeight / 2) - 10;
                })
                .attr('fill', colorScale(c))
                .text(function(d, i) {
                    return d[c].toFixed(0) + '%';
                });

        chartElement.append('g')
            .attr('class', 'value ' + classify(c))
            .selectAll('text')
            .data(config['data'])
            .enter().append('text')
                .attr('x', function(d, i) {
                    return xScale(d[c]);
                })
                .attr('y', function(d,i) {
                    return i * (barHeight + barGap) + (barHeight / 2) - 10;
                })
                .attr('fill', colorScale(c))
                .text(function(d, i) {
                    return d[c].toFixed(0) + '%';
                });
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
