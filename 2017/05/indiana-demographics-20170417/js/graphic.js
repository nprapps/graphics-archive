// Global vars
var pymChild = null;
var isMobile = false;
var charts = [];
var geoCategories = [];

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
    charts = d3.keys(DATA);

    charts.forEach(function(v, k) {
        DATA[v].forEach(function(d) {
            for (key in d) {
                if (key != 'label') {
                    d[key] = +d[key];
                }
            }
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

    var graphicWidth = null;
    var gutterWidth = 22;
    var labelWidth = 31;
    var labelGap = 6;
    var numCols = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 2;
    } else {
        isMobile = false;
        numCols = 4;
    }
    graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1)) - labelWidth - labelGap) / numCols);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#column-chart');
    containerElement.html('');

    charts.forEach(function(v, k) {
        var categories = d3.keys(DATA[v][0]).filter(function(d, i) {
            return d != 'label';
        });

        var chartContainer = containerElement.append('div')
            .attr('class', 'chart-container ' + classify(v));

        categories.forEach(function(d, i) {
            var thisGraphicWidth = graphicWidth;
            var showLabels = false;
            if (i % numCols == 0) {
                thisGraphicWidth += labelWidth + labelGap;
                showLabels = true;
            }

            // containing div
            var chartElement = chartContainer.append('div')
                .attr('class', 'chart c-' + classify(d));
            chartElement.attr('style', function() {
                var s = '';
                s += 'width: ' + thisGraphicWidth + 'px; ';
                s += 'float: left; ';
                if (!showLabels) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });

            var header = chartElement.append('h3')
                .text(d);
            if (showLabels) {
                header.attr('style', 'margin-left:' + (labelWidth + labelGap) + 'px;');
            }

            // Render the chart!
            renderColumnChart({
                container: '.chart.c-' + classify(d),
                width: thisGraphicWidth,
                data: DATA[v],
                dataColumn: d,
                domain: [ 0, 100 ],
                showLabels: showLabels,
                labelWidth: labelWidth,
                labelGap: labelGap
            });
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
    var valueColumn = config['dataColumn'];

    var aspectWidth = isMobile ? 4 : 4;
    var aspectHeight = isMobile ? 3 : 2.25;
    var valueGap = 6;
    var tickValues = [ 0, 25, 50, 75, 100 ];

    var margins = {
        top: 5,
        right: 0,
        bottom: 20,
        left: (config['labelWidth'] + config['labelGap'])
    };

    if (!config['showLabels']) {
        margins['left'] = 0;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

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

    var min = config['domain'][0];
    var max = config['domain'][1];

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
            console.log(d);
            d = d3.time.format('%Y').parse(d);
            if (i == 0 || i == (config['data'].length - 1)) {
                // return '\u2019' + fmtYearAbbrev(d);
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickValues(tickValues)
        .tickFormat(function(d) {
            if (config['showLabels']) {
                return fmtComma(d) + '%';
            }
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
                return 'bar bar-' + d[labelColumn];
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
        .data(config['data'].filter(function(d, i) {
            if (i == 0 || i == (config['data'].length - 1)) {
                return d;
            }
        }))
        .enter()
        .append('text')
            .text(function(d) {
                return d[valueColumn].toFixed(0) + '%';
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dy', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                d3.select(this).classed('out', true)
                return -(textHeight - valueGap / 2);
            })
            .attr('text-anchor', 'middle')
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
