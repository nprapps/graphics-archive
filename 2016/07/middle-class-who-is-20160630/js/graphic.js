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
        d['lower_bound'] = +d['lower_bound'];
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
    var boundColumn = 'lower_bound';

    var barHeight = 80;
    var barGap = 0;
    var labelWidth = 0;
    var labelMargin = 10;
    var valueGap = 0;
    var paddingBottom = 5;

    var margins = {
        top: 60,
        right: 25,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length) + paddingBottom;

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

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    })

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
            console.log(d,i);
            return '$' + fmtComma(d);
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
                return xScale(d[boundColumn]);
            })
            .attr('width', function(d) {
                return xScale(d[valueColumn] - d[boundColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' bar-' + classify(d[labelColumn]);
            });

    /*
     * Render income group lines
     */
    var annoLines = chartElement.append('g')
        .attr('class', 'anno-lines');

    var medianX = xScale(ANNOS['median']);
    var medianY = -10;
    var notchHeight = 8;
    var lowerX = xScale(ANNOS['value_lower']);
    var upperX = xScale(ANNOS['value_upper']);

    //var annoBracket = annoLines.append('g')
        //.attr('class', 'anno-bracket');

    //var lowerBracketPath = _createBracketPath([
        //[lowerX, medianY + notchHeight],
        //[lowerX, medianY],
        //[medianX - 5, medianY]
    //]);

    //var upperBracketPath = _createBracketPath([
        //[upperX, medianY + notchHeight],
        //[upperX, medianY],
        //[medianX + 5, medianY]
    //]);

    //annoBracket.append('path')
        //.attr('d', lowerBracketPath);

    //annoBracket.append('path')
        //.attr('d', upperBracketPath);

    annoLines.append('line')
        .attr('class', 'anno-line lower')
        .attr('x1', lowerX)
        .attr('x2', lowerX)
        .attr('y1', medianY)
        .attr('y2', chartHeight);

    annoLines.append('line')
        .attr('class', 'anno-line upper')
        .attr('x1', upperX)
        .attr('x2', upperX)
        .attr('y1', medianY)
        .attr('y2', chartHeight);

    annoLines.append('line')
        .attr('class', 'anno-line median')
        .attr('x1', medianX)
        .attr('x2', medianX)
        .attr('y1', medianY)
        .attr('y2', chartHeight);

    var textOffset = 14;
    var dyOffset = -10;

    annoLines.append('text')
        .attr('class', 'anno-label quantity median')
        .attr('x', medianX)
        .attr('y', medianY - textOffset - textOffset)
        .attr('dy', dyOffset)
        .text('Median');

    annoLines.append('text')
        .attr('class', 'anno-label quantity median')
        .attr('x', medianX)
        .attr('y', medianY - textOffset)
        .attr('dy', dyOffset)
        .text('income');

    annoLines.append('text')
        .attr('class', 'anno-label median')
        .attr('x', medianX)
        .attr('y', medianY)
        .attr('dy', dyOffset)
        .text('$' + fmtComma(ANNOS['median']));

    annoLines.append('text')
        .attr('class', 'anno-label quantity lower')
        .attr('x', lowerX)
        .attr('y', medianY - textOffset - textOffset)
        .attr('dy', dyOffset)
        .text(ANNOS['quantity_lower']);

    annoLines.append('text')
        .attr('class', 'anno-label quantity lower')
        .attr('x', lowerX)
        .attr('y', medianY - textOffset)
        .attr('dy', dyOffset)
        .text(ANNOS['label_lower']);

    annoLines.append('text')
        .attr('class', 'anno-label lower')
        .attr('x', lowerX)
        .attr('y', medianY)
        .attr('dy', dyOffset)
        .text('$' + fmtComma(ANNOS['value_lower']));

    annoLines.append('text')
        .attr('class', 'anno-label quantity upper')
        .attr('x', upperX)
        .attr('y', medianY - textOffset - textOffset)
        .attr('dy', dyOffset)
        .text(ANNOS['quantity_upper']);

    annoLines.append('text')
        .attr('class', 'anno-label quantity upper')
        .attr('x', upperX)
        .attr('y', medianY - textOffset)
        .attr('dy', dyOffset)
        .text(ANNOS['label_upper']);

    annoLines.append('text')
        .attr('class', 'anno-label upper')
        .attr('x', upperX)
        .attr('y', medianY)
        .attr('dy', dyOffset)
        .text('$' + fmtComma(ANNOS['value_upper']));

    function _createBracketPath(points) {
        var pathString = 'M';
        for (var i=0; i<points.length; i++) {
            var point = points[i];

            if (i > 0) {
                pathString += 'L';
            }

            pathString += point[0];
            pathString += ',';
            pathString += point[1];
        }

        return pathString;
    }

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
    chartElement.append('g')
        .attr('class', 'bar-label')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                return d[labelColumn];
            })
            .attr('x', function(d) {
                return xScale(d[boundColumn] + (d[valueColumn] - d[boundColumn])/2);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                return 0;
            })
            .attr('dy', (barHeight / 2) + 5)

    /*
     * Render bar values.
     */
    //chartElement.append('g')
        //.attr('class', 'value')
        //.selectAll('text')
        //.data(config['data'])
        //.enter()
        //.append('text')
            //.text(function(d) {
                //return d[valueColumn].toFixed(0) + '%';
            //})
            //.attr('x', function(d) {
                //return xScale(d[valueColumn]);
            //})
            //.attr('y', function(d, i) {
                //return i * (barHeight + barGap);
            //})
            //.attr('dx', function(d) {
                //var xStart = xScale(d[valueColumn]);
                //var textWidth = this.getComputedTextLength()

                //// Negative case
                //if (d[valueColumn] < 0) {
                    //var outsideOffset = -(valueGap + textWidth);

                    //if (xStart + outsideOffset < 0) {
                        //d3.select(this).classed('in', true)
                        //return valueGap;
                    //} else {
                        //d3.select(this).classed('out', true)
                        //return outsideOffset;
                    //}
                //// Positive case
                //} else {
                    //if (xStart + valueGap + textWidth > chartWidth) {
                        //d3.select(this).classed('in', true)
                        //return -(valueGap + textWidth);
                    //} else {
                        //d3.select(this).classed('out', true)
                        //return valueGap;
                    //}
                //}
            //})
            //.attr('dy', (barHeight / 2) + 3)
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
