// Global vars
var pymChild = null;
var isMobile = false;
var isRelative = false;
var categories = [];
var charts = [];
var labelColumn = 'label';
// var valueColumn = 'amt';
var valueColumn = 'pct';

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
        d[valueColumn] = +d[valueColumn];
    });

    categories = _.uniq(_.pluck(DATA, labelColumn));
    charts = _.uniq(_.pluck(DATA, 'chart'));

    if (categories[0].toLowerCase().includes('own')) {
        isRelative = true;
    }
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = containerWidth;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#column-chart');
    containerElement.html('');

    // create a legend
    renderLegend({
        container: '#column-chart'
    });

    // Define y-axis bounds
    var roundTicksFactor = 10;
    var min = 0;
    var max = d3.max(DATA, function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    // render each chart
    charts.forEach(function(d, i) {
        var chartData = DATA.filter(function(v, k) {
            return v['chart'] == d;
        });

        var chartElement = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        if (!isMobile) {
            chartElement.attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (i % 2 > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        // Render the chart!
        renderColumnChart({
            container: '#column-chart .chart.' + classify(d),
            width: graphicWidth,
            data: chartData,
            title: d,
            yDomain: [ min, max ]
        });
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render legend
 */
var renderLegend = function(config) {
    var containerElement = d3.select(config['container']);

    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(categories)
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b');

    legend.append('label')
        .text(function(d) {
            return d;
        });
}


/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    // var labelColumn = 'label';
    // var valueColumn = valueColumn;

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;
    var valueGap = 6;

    var leftMargin = 30;
    var unitLabel = '';

    if (valueColumn == 'pct') {
        leftMargin = 32;
        unitLabel = '%';
    }

    var bottomMargin = 5;
    if (isRelative) {
        bottomMargin = 20;
    }

    var margins = {
        top: 5,
        right: 5,
        bottom: bottomMargin,
        left: leftMargin
    };

    var ticksY = 4;
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h3')
        .html(config['title']);

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

    var min = config['yDomain'][0];
    var max = config['yDomain'][1];

    var yScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ chartHeight, 0 ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            // return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d) + unitLabel;
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

    if (isRelative) {
        var axisYPos = chartHeight + 18;
        var axisXOffset = xScale.rangeBand() / 2;

        var axisLabels = chartElement.append('g')
            .attr('class', 'x axis labels');
        axisLabels.append('text')
            .text('Favored')
            .attr('x', xScale(xScale.domain()[0]))
            .attr('y', axisYPos)
            .attr('text-anchor', 'start');
        axisLabels.append('text')
            .text('Toss-up')
            .attr('x', xScale(xScale.domain()[3]) + axisXOffset)
            .attr('y', axisYPos)
            .attr('text-anchor', 'middle');
        axisLabels.append('text')
            .text('Unlikely')
            .attr('x', xScale(xScale.domain()[6]) + (axisXOffset * 2))
            .attr('y', axisYPos)
            .attr('text-anchor', 'end');
    }

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
                return 'bar ' + classify(d[labelColumn]);
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
                return d[valueColumn].toFixed(0) + unitLabel;
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
