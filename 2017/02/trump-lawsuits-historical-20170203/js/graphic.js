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

    // Render the chart!
    renderBarChart({
        container: '#bar-chart',
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
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var barHeight = 30;
    var barGap = 15;
    var barPadding = 17;
    var labelWidth = 7;
    var labelMargin = 0;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 7,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 10;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap + barPadding) * config['data'].length);

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
    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var maxRaw = d3.max(config['data'], function(d) {
        return d[valueColumn];
    });
    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    var blockGap = 1;
    var blockWidth = (xScale(maxRaw) - (blockGap * maxRaw)) / maxRaw;

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d.toFixed(0);
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
    var bars = chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('g')
        .data(config['data'])
        .enter()
        .append('g')
            .attr('transform', function(d,i) {
                var xOffset;
                if (d[valueColumn] >= 0) {
                    xOffset = xScale(0);
                } else {
                    xOffset = xScale(d[valueColumn]);
                }

                var yOffset = (i * (barHeight + barGap + barPadding)) + barPadding;
                return 'translate(' + xOffset + ',' + yOffset + ')';
            })
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
            });

    bars.selectAll('rect')
        .data(function(d) {
            var dataLength = d[valueColumn];
            var thisData = [];
            for (var i = 0; i < dataLength; i++) {
                thisData.push(d[labelColumn]);
            }
            return thisData;
        }).enter()
            .append('rect')
                .attr('class', 'block')
                .attr('height', barHeight)
                .attr('width', blockWidth)
                .attr('y', 0)
                .attr('x', function(d,i) {
                    return (blockWidth + blockGap) * i;
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
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': chartWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'height': barHeight + 'px',
                    'left': labelWidth + 'px',
                    'top': (i * (barHeight + barGap + barPadding)) + 'px'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('h3')
                .text(function(d) {
                    return d['fullname'];
                });

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d,i) {
                return d[valueColumn].toFixed(0);
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap + barPadding) + barPadding;
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()

                d3.select(this).classed('out', true)
                return valueGap;
            })
            .attr('dy', (barHeight / 2) + 3)
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
