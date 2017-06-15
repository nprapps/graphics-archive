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
 * Format data for D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
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

    var containerElement = d3.select('#graphic');
    containerElement.html('');

    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'bar-chart-neg');

    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'bar-chart-pos');

    // Render the chart!
    renderBarChart({
        container: '#bar-chart-neg',
        width: containerWidth,
        data: DATA.slice(0,7),
        label: 'Biggest proposed cuts'
    });

    renderBarChart({
        container: '#bar-chart-pos',
        width: containerWidth,
        data: DATA.slice(7),
        label: 'Budget increases'
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
    var valueColumn = 'amt';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 0;
    var labelMargin = 0;
    var valueGap = 6;
    var splitIndex = 0;
    var splitHeight = 0;

    var margins = {
        top: 0,
        right: 12,
        bottom: config['container'] == '#bar-chart-pos' ? 20 : 5,
        left: 12
    };

    var ticksX = 4;
    var roundTicksFactor = 10;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length) + splitHeight;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['label']);

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
    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    })

    min = -40;
    max = 40;

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
            .tickFormat(function(d) {
                return d.toFixed(0) + '%';
            });

    if (config['container'] == '#bar-chart-pos') {
        /*
         * Render axes to chart.
         */
        chartElement.append('g')
            .attr('class', 'x axis')
            .attr('transform', makeTranslate(0, chartHeight))
            .call(xAxis);
    }

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
                var yOffset = i > splitIndex ? splitHeight : 0;
                return i * (barHeight + barGap) + yOffset;
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                var directionClass = d[valueColumn] > 0 ? ' bar-pos ' : ' bar-neg ';
                return 'bar-' + i + directionClass + classify(d[labelColumn]);
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
    var barLabels = chartElement.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d) {
                return d[labelColumn];
            })
            .attr('class', function(d) {
                if (d[valueColumn] < 0) {
                    return 'value-neg';
                } else {
                    return 'value-pos';
                }
            })
            .attr('x', function(d) {
                return xScale(0);
            })
            .attr('y', function(d, i) {
                var yOffset = i > splitIndex ? splitHeight : 0;
                return i * (barHeight + barGap) + yOffset;
            })
            .attr('dx', function(d) {
                if (d[valueColumn] < 0) {
                    return valueGap;
                } else {
                    return -valueGap;
                }
            })
            .attr('dy', (barHeight / 2) + 3)

    if (isMobile) {
        barLabels.call(wrapText, (chartWidth / 2) - valueGap, 11);
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
                return d[valueColumn].toFixed(0) + '%';
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                var yOffset = i > splitIndex ? splitHeight : 0;
                return i * (barHeight + barGap) + yOffset;
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
            .attr('dy', (barHeight / 2) + 3)

    //chartWrapper.append('h3')
        //.attr('class', 'chart-text')
        //.style('left', 0)
        //.style('top', 0)
        //.html('Agencies with budget increases');

    //chartWrapper.append('h3')
        //.attr('class', 'chart-text')
        //.style('left', 0)
        //.style('top', (splitIndex * (barHeight + barGap)) + 'px')
        //.html('Five biggest budget cuts');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
