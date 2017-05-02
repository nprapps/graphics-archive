// Global vars
var pymChild = null;
var isMobile = false;
var isFlipped = false;
var charts = [];
var FLIP_THRESHOLD = 600;

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
        d['amt'] = +d['amt'];
    });

    charts = _.uniq(_.pluck(DATA, 'chart'), true);
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var numCols = null;
    var metaGutterWidth = 44;
    var gutterWidth = 22;
    var yLabelWidth = 38;
    var chartContainerWidth = null;
    var mapContainerWidth = null;

    if (containerWidth <= FLIP_THRESHOLD) {
        isFlipped = false;
        chartContainerWidth = containerWidth;
        mapContainerWidth = containerWidth;
    } else {
        isFlipped = true;
        chartContainerWidth = Math.floor((containerWidth - metaGutterWidth) * (2/3));
        mapContainerWidth = Math.floor((containerWidth - metaGutterWidth) * (1/3));
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 2;
    } else {
        isMobile = false;
        numCols = 3;
    }
    var graphicWidth = Math.floor((chartContainerWidth - (gutterWidth * (numCols - 1)) - yLabelWidth) / numCols);

    var roundTicksFactor = 5000;
    var chartExtent = [ -10000, 5000 ];

    // Size wrapper elements
    d3.select('.graphic-wrapper')
        .attr('style', function() {
            var s = '';
            if (isFlipped) {
                s += 'width: ' + chartContainerWidth + 'px; ';
                s += 'float: right; ';
            }
            return s;
        });

    d3.select('.map-wrapper')
        .attr('style', function() {
            var s = '';
            if (isFlipped) {
                s += 'width: ' + mapContainerWidth + 'px; ';
                s += 'float: left; ';
                s += 'padding-right: ' + Math.floor(metaGutterWidth / 2) + 'px; ';
                s += 'border-right: 1px solid #eee; ';
            }
            return s;
        });

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#column-chart');
    containerElement.html('');

    _.each(charts, function(d, i) {
        var thisGraphicWidth = graphicWidth;
        var showYLabels = false;
        if (i % numCols == 0) {
            showYLabels = true;
            thisGraphicWidth += yLabelWidth;
        }

        var chartData = DATA.filter(function(v,k) {
            return v['chart'] == d;
        });

        var chartElement = containerElement.append('div')
            .attr('class', 'chart c-' + classify(d));

        if (numCols > 1) {
            chartElement.attr('style', function() {
                var s = '';
                s += 'width: ' + thisGraphicWidth + 'px; ';
                s += 'float: left; ';
                if (i % numCols > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        // Render the chart!
        renderColumnChart({
            container: '.chart.c-' + classify(d),
            width: thisGraphicWidth,
            data: chartData,
            title: TITLES[d],
            domainY: chartExtent,
            showYLabels: showYLabels,
            yLabelWidth: yLabelWidth
        });
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
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

    // var aspectWidth = 4;
    // var aspectHeight = 3;
    var aspectWidth = isMobile ? 4 : 1;
    var aspectHeight = isMobile ? 3 : 1;
    var valueGap = 6;
    var showYLabels = config['showYLabels'];

    var margins = {
        top: 23,
        right: 5,
        bottom: 5,
        left: 0
    };
    if (showYLabels) {
        margins['left'] = config['yLabelWidth'];
    }

    var ticksY = 4;
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');
    containerElement.append('h3')
        .text(config['title'])
        .attr('style', 'margin-left: ' + margins['left'] + 'px; ');

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
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var min = config['domainY'][0];
    var max = config['domainY'][1];

    var yScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ chartHeight, 0 ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .tickFormat(function(d, i) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (showYLabels) {
                return formatVal(d, 0);
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        // .attr('transform', makeTranslate(0, chartHeight))
        .attr('transform', makeTranslate(0, -5))
        .call(xAxis);

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
            .attr('class', function(d) {
                var c = 'bar bar-' + d[labelColumn];
                if (d[valueColumn] < 0)  {
                    c += ' negative';
                } else {
                    c += ' positive';
                }
                return c;
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
            .text(function(d) {
                return formatVal(d[valueColumn], 1);
            })
            .attr('class', function(d) {
                if (d[valueColumn] < 0)  {
                    return 'negative';
                } else {
                    return 'positive';
                }
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
            .attr('text-anchor', 'middle')
}

var formatVal = function(val, decimals) {
    var newVal = (Math.abs(val) / 1000).toFixed(decimals);
    if (val > 0) {
        return '+$' + newVal + 'k';
    } else if (val < 0) {
        return '-$' + newVal + 'k';
    } else {
        return '$' + val;
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
