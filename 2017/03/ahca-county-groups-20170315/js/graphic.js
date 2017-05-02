// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'category', 'values', 'total' ];

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
        var y0 = 0;

        d['values'] = [];
        d['total'] = 0;

        for (var key in d) {
            if (_.contains(skipLabels, key)) {
                continue;
            }

            d[key] = +d[key];

            var y1 = y0 + d[key];
            d['total'] += d[key];

            d['values'].push({
                'name': key,
                'y0': y0,
                'y1': y1,
                'val': d[key]
            })

            y0 = y1;
        }
    });
    // console.log(DATA);
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
    renderGroupedStackedColumnChart({
        container: '#stacked-grouped-column-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a grouped stacked column chart.
 */
var renderGroupedStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var isWide = config['width'] > 800;

    var aspectWidth = 16;
    var aspectHeight = isWide ? 6 : 9;
    var valueGap = 6;

    var margins = {
        top: 40,
        right: 1,
        bottom: 15,
        left: 47
    };

    var ticksY = 5;
    var roundTicksFactor = 1000;

    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
        margins['bottom'] = 15;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'category'))
        .rangeRoundBands([0, chartWidth], .1)

    var xScaleBars = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .rangeRoundBands([0, xScale.rangeBand()], .1)

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([chartHeight, 0]);

    /*
     * Render the legend.
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(xScaleBars.domain())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b');

    legend.append('label')
        .text(function(d) {
            return d + ' counties';
        });
     */

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var svgElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom']);

    // Add arrowhead def
    var svgDefs = svgElement.append('defs');
    var arrowWidth = 7;

    svgDefs.append('marker')
        .attr({
            id: 'arrow',
            viewBox: '0 -5 10 10',
            refX: 8,
            refY: 0,
            markerWidth: arrowWidth,
            markerHeight: arrowWidth,
            orient: 'auto-start-reverse'
        }).append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'arrowhead');

    var chartElement = svgElement.append('g')
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    var chartAnnos = chartWrapper.append('div')
        .attr('class', 'anno-wrapper');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d >= 0) {
                return '$' + fmtComma(d);
            } else {
                return '-$' + fmtComma(Math.abs(d));
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
         .attr('class', 'x axis category')
         .call(xAxis);

    chartElement.selectAll('.x.axis.category .tick line').remove();
    chartElement.selectAll('.x.axis.category text')
        .attr('y', -25)
        .attr('dy', 0)
        .call(wrapText, xScale.rangeBand(), 13);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

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
    xScale.domain().forEach(function(c, k) {
        var categoryElement = chartElement.append('g')
            .attr('class', classify(c));

        var categoryData = config['data'].filter(function(d,i) {
                return d['category'] == c;
            });

        var columns = categoryElement.selectAll('.columns')
            .data(categoryData)
            .enter().append('g')
                .attr('class', function(d) {
                    return 'column ' + classify(d['label']);
                })
                .attr('transform', function(d) {
                    return makeTranslate(xScale(d['category']), 0);
                });

        // axis labels
        var xAxisBars = d3.svg.axis()
            .scale(xScaleBars)
            .orient('top')
            .tickFormat(function(d) {
                return d;
            });

        categoryElement.append('g')
            .attr('class', 'x axis bars')
            .attr('transform', function(d) {
                return makeTranslate(xScale(c), 0);
            })
            .call(xAxisBars);

        // column segments
        var bars = columns.append('g')
            .attr('class', 'bar')
            .attr('transform', function(d) {
                return makeTranslate(xScaleBars(d[labelColumn]), 0);
            });

        bars.selectAll('rect')
            .data(function(d) {
                return d['values'];
            })
            .enter().append('rect')
                .attr('y', function(d) {
                    if (d['y1'] < d['y0']) {
                        return yScale(d['y0']);
                    }

                    return yScale(d['y1']);
                })
                .attr('width', xScaleBars.rangeBand())
                .attr('height', function(d) {
                    return Math.abs(yScale(d['y0']) - yScale(d['y1']));
                })
                .attr('class', function(d) {
                    return classify(d['name']);
                });

        /*
         * Render metro-rural labels for each grou
         */
        var diff = categoryData[2]['total'] - categoryData[0]['total'];
        var diffFormat;
        if (diff >= 0) {
            diffFormat = '$' + fmtComma(diff.toFixed(0));
        } else {
            diffFormat = '-$' + fmtComma(Math.abs(diff).toFixed(0));
        }

        var annoLines = categoryElement.append('g')
            .attr('class', 'anno-lines')
            .attr('transform', function(d) {
                return makeTranslate(xScale(c), 0);
            });

        var arrowOffset = Math.ceil(arrowWidth / 2);

        // Add dashed line and arrow
        if (categoryData[0]['total'] < 0) {
            annoLines.append('line')
                .attr('class', 'dashed-line')
                .attr('x1', xScaleBars(categoryData[1][labelColumn]))
                .attr('x2', xScaleBars(categoryData[2][labelColumn]) + xScaleBars.rangeBand() - arrowOffset)
                .attr('y1', yScale(categoryData[0]['total']) - 1)
                .attr('y2', yScale(categoryData[0]['total']) - 1);

            annoLines.append('line')
                .attr('class', 'arrow-line')
                .attr('marker-start', 'url(#arrow)')
                .attr('marker-end', 'url(#arrow)')
                .attr('x1', xScaleBars(categoryData[2][labelColumn]) + xScaleBars.rangeBand() - arrowOffset)
                .attr('x2', xScaleBars(categoryData[2][labelColumn]) + xScaleBars.rangeBand() - arrowOffset)
                .attr('y1', yScale(categoryData[2]['total']) + 2)
                .attr('y2', yScale(categoryData[0]['total']) - 3);

            annoLines.append('text')
                .text(diffFormat + ' difference')
                .attr('x', xScaleBars(categoryData[2][labelColumn]) + xScaleBars.rangeBand() - arrowOffset)
                .attr('y', yScale(categoryData[0]['total']) + 15);

        } else {
            annoLines.append('line')
                .attr('class', 'dashed-line')
                .attr('x1', xScaleBars(categoryData[0][labelColumn]) + arrowOffset)
                .attr('x2', xScaleBars(categoryData[1][labelColumn]) + xScaleBars.rangeBand())
                .attr('y1', yScale(categoryData[2]['total']) + 1)
                .attr('y2', yScale(categoryData[2]['total']) + 1);

            annoLines.append('line')
                .attr('class', 'arrow-line')
                .attr('marker-start', 'url(#arrow)')
                .attr('marker-end', 'url(#arrow)')
                .attr('x1', xScaleBars(categoryData[0][labelColumn]) + arrowOffset)
                .attr('x2', xScaleBars(categoryData[0][labelColumn]) + arrowOffset)
                .attr('y1', yScale(categoryData[2]['total']) + 3)
                .attr('y2', yScale(categoryData[0]['total']) - 2);

            annoLines.append('text')
                .text(diffFormat + ' difference')
                .attr('x', xScaleBars(categoryData[0][labelColumn]) + arrowOffset)
                .attr('y', yScale(categoryData[2]['total']) - 5);
        }
    })

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
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
