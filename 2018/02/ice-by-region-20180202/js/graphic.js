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

var columns = ['arrests', 'removals'];

/*
 * Format data for D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        columns.forEach(function(val) {
            d[val] = +d[val];
        });
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

    var containerElement = d3.select('#bar-chart');
    containerElement.html('');

    columns.forEach(function(val, i) {
        containerElement.append('div')
            .attr('id', 'bar-chart-' + val)
            .attr('class', 'chart-wrapper');

        // Render the chart!
        var labelWidth = 100,
            barWidth = (containerWidth  - labelWidth ) * 0.48;

        renderBarChart({
            hed: LABELS['hed_' + val],
            container: '#bar-chart-' + val,
            labelWidth: isMobile || i === 0 ? labelWidth : 0,
            width: isMobile ? containerWidth : i === 0 ? (barWidth + labelWidth) : barWidth,
            min: -100,
            max: 400,
            tickValues: [-100, 0, 100, 200, 300, 400],
            data: DATA,
            key: val
        });
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = config['key'];

    var barHeight = 20;
    var barGap = 5;
    var labelWidth = config.labelWidth;
    var labelMargin = 12;
    var valueGap = 6;

    var margins = {
        top: 10,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin) + 5
    };

    var ticksX = 3;
    var roundTicksFactor = 100;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');
    containerElement.style('width', config['width'] + 'px');

    containerElement.append('h3')
        .text(config.hed)
        .style('padding-left', margins.left + 'px');

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

    var min = config.min,
        max = config.max;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        //.ticks(ticksX)
        .tickValues(config['tickValues'])
        .tickFormat(function(d) {
            if (d === 0) {
                return 0;
            } else {
                return d.toFixed(0) + '%';
            }
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
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
            })
            .attr('fill', function(d) {
                if (d['label'] === 'Atlanta') {
                    return COLORS['teal2'];
                } else if (d[valueColumn] > 0) {
                    return COLORS['teal4'];
                } else {
                    return COLORS['orange3'];
                }
            });

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

    /*
     * Render bar labels.
     */

    if (labelWidth != 0) {
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
                        'top': (i * (barHeight + barGap)) + 'px'
                    });
                })
                .attr('class', function(d) {
                    return classify(d[labelColumn]);
                })
                .append('span')
                    .text(function(d) {
                        return d[labelColumn];
                    });
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
            .text(function(d) {
                if (d[valueColumn] < -0) {
                    return d[valueColumn].toFixed(1) + '%';
                } else {
                    return "+" + d[valueColumn].toFixed(1) + '%';
                }

            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()

                // Negative case
                if (d[valueColumn] < 0) {
                    var outsideOffset = -(valueGap + textWidth);

                    if (xStart + outsideOffset < 0) {
                        d3.select(this).classed('in', true)
                        return valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return outsideOffset;
                    }
                // Positive case
                } else {
                    if (xStart + valueGap + textWidth > chartWidth) {
                        d3.select(this).classed('in', true)
                        return -(valueGap + textWidth);
                    } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    }
                }
            })
            .attr('dy', (barHeight / 2) + 3);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
