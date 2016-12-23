// Global vars
var pymChild = null;
var isMobile = false;
var formattedData = [];
var keys = [ 'Clinton', 'Trump', 'Other'];

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
    _.each(keys, function(d) {
        formattedData[d] = [];
    });
    _.each(DATA, function(d) {
        for (key in d) {
            if (!_.contains([ 'label', 'label_fmt' ], key)) {
                d[key] = +d[key];
                formattedData[key].push({ 'label': d['label'],
                                          'label_fmt': d['label_fmt'],
                                          'amt': d[key]
                                        });
            }
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

    var graphicWidth = null;
    var gutterWidth = 11;
    var labelWidth = 130;
    var labelMargin = 10;
    var defaultLeftMargin = 10;
    var numCols = 3;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 1;
    } else {
        isMobile = false;
    }

    graphicWidth = Math.floor((containerWidth - (labelWidth + labelMargin) - (gutterWidth * (numCols - 1))) / numCols);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#bar-chart');
    containerElement.html('');

    _.each(keys, function(d,i) {
        var showLabels = false;
        var thisGraphicWidth = graphicWidth;
        if (i == 0 || isMobile) {
            showLabels = true;
            thisGraphicWidth += labelWidth + labelMargin;
        }

        var chartElement = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));
        if (!isMobile) {
            chartElement.attr('style', function() {
                var s = '';
                s += 'width: ' + thisGraphicWidth + 'px; ';
                s += 'float: left; ';
                if (i > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        // Render the chart!
        renderBarChart({
            container: '#bar-chart .chart.' + classify(d),
            width: thisGraphicWidth,
            data: formattedData[d],
            domainX: [ -10, 10 ],
            showLabels: showLabels,
            labelWidth: labelWidth,
            labelMargin: labelMargin,
            defaultLeftMargin: defaultLeftMargin,
            title: d
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
    var valueColumn = 'amt';

    var barHeight = 35;
    var barGap = 5;
    var labelWidth = config['labelWidth'];
    var labelMargin = config['labelMargin'];
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 10,
        bottom: 20,
        left: config['defaultLeftMargin']
    };

    if (config['showLabels']) {
        margins['left'] = (labelWidth + labelMargin);
    }

    var ticksX = 4;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length) + barGap;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h3')
        .attr('style', 'margin-left: ' + margins['left'] + 'px; margin-right: ' + margins['right'] + 'px;')
        .text(config['title']);

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
    var min = config['domainX'][0];
    var max = config['domainX'][1];

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    var bg = chartElement.append('rect')
        .attr('x', xScale(min))
        .attr('width', chartWidth)
        .attr('y', 0)
        .attr('height', chartHeight)
        .attr('fill', '#f1f1f1');

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
                return (i * (barHeight + barGap)) + barGap;
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' b-' + classify(d[labelColumn]);
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
    if (config['showLabels']) {
        chartWrapper.append('ul')
            .attr('class', 'labels')
            .attr('style', formatStyle({
                'width': labelWidth + 'px',
                'top': (margins['top'] + barGap) + 'px',
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
                    .html(function(d) {
                        return d['label_fmt'];
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
                return d[valueColumn].toFixed(1) + '%';
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
            .attr('dy', (barHeight / 2) + 3)
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
