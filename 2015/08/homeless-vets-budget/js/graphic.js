// Global config
var GRAPHIC_DEFAULT_WIDTH = 700;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

var fmtComma = d3.format('0,000');

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData();
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    GRAPHIC_DATA.forEach(function(d) {
        var y0 = 0;

        d['values'] = [];
        d['total'] = 0;

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'total') {
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

    COUNT_DATA.forEach(function(d) {
        d['amt'] = +d['amt'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth || containerWidth > GRAPHIC_DEFAULT_WIDTH) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    var width = renderStackedColumnChart({
        container: '#budget',
        width: containerWidth,
        height: containerWidth / 2,
        data: GRAPHIC_DATA
    });

    var availableWidth = containerWidth * 0.4;
    var leftMargin = availableWidth - width;

    if (isMobile) {
        availableWidth = containerWidth;
        leftMargin = 50;
    }

    renderColumnChart({
        container: '#count',
        width: availableWidth,
        height: containerWidth / 2,
        data: COUNT_DATA,
        margins: {
            top: 5,
            right: 5,
            bottom: 20,
            left: leftMargin
        }
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked column chart.
 */
var renderStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 90
    };

    var ticksY = 4;
    var roundTicksFactor = 500000000;

    if (isMobile) {
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = config['height'] - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .rangeRoundBands([0, chartWidth], .1)

    var yScale = d3.scale.linear()
        .domain([0, d3.max(config['data'], function(d) {
            return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
        })])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            return d != labelColumn && d != 'values' && d != 'total';
        }))
        .range([ COLORS['red4'], COLORS['orange4'], COLORS['yellow4'], COLORS['teal4'], COLORS['blue4'] ]);

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorScale.domain().reverse())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .html(function(d) {
            return d;
        });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (d == '2015') {
                return d;
            }

            var every = 3;

            if (isMobile) {
                var every = 5;
            }

            if ((2015 - parseInt(d)) % every == 0) {
                return d;
            }

            return '';
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return '$' + fmtComma(d);
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
     * Render Obama background
     */
    chartElement.append('rect')
        .attr('class', 'obama-years')
        .attr('x', function(d) {
            return xScale(2009);
        })
        .attr('width', function() {
            var left = xScale(2009);
            var right = chartWidth;

            return right - left;
        })
        .attr('y', function(d) {
        return yScale(yScale.domain()[1]);
        })
        .attr('height', function(d) {
            return yScale(yScale.domain()[0]);
        })
        .style('fill', function(d) {
            return '#f3f3f3';
        });

    // chartElement.append('text')
    //     .attr('class', 'obama-label')
    //     .attr('x', function(d) {
    //         return xScale(2010);
    //     })
    //     .attr('y', function(d) {
    //     return yScale(1200000000);
    //     })
    //     .text('Obama')

    /*
     * Render bars to chart.
     */
    var bars = chartElement.selectAll('.bars')
        .data(config['data'])
        .enter().append('g')
            .attr('class', 'bar')
            .attr('transform', function(d) {
                return makeTranslate(xScale(d[labelColumn]), 0);
            });

    bars.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('width', xScale.rangeBand())
            .attr('y', function(d) {
                return yScale(d['y1']);
            })
            .attr('height', function(d) {
                return yScale(d['y0']) - yScale(d['y1']);
            })
            .style('fill', function(d) {
                return colorScale(d['name']);
            })
            .attr('class', function(d) {
                return classify(d['name']);
            });

    // bars.selectAll('text')
    //     .data(function(d) {
    //         return d['values'];
    //     })
    //     .enter().append('text')
    //         .attr('x', function(d) {
    //             return xScale.rangeBand() / 2;
    //         })
    //         .attr('y', function(d) {
    //             return yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);
    //         })
    //         .attr('class', function(d) {
    //             return classify(d['name']);
    //         })
    //         .attr('text-anchor', 'middle')
    //         .text(function(d) {
    //             return d['val'];
    //         })

    var left = xScale(2009) - xScale.rangeBand() / 2;

    return chartWidth - left;
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

    var valueMinHeight = 30;

    var margins = config['margins'];

    var ticksY = 5;
    var roundTicksFactor = 20000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = config['height'] - margins['top'] - margins['bottom'];

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
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], .109)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var yScale = d3.scale.linear()
        .domain([0, d3.max(config['data'], function(d) {
            return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (d == '2015') {
                return d;
            }

            if ((2015 - parseInt(d)) % 3 == 0) {
                return d;
            }

            return '';
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
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
     * Render Obama background
     */
    chartElement.append('rect')
        .attr('class', 'obama-years')
        .attr('x', function(d) {
            return xScale(2009);
        })
        .attr('width', function() {
            var left = xScale(2009);
            var right = chartWidth;

            return right - left;
        })
        .attr('y', function(d) {
        return yScale(yScale.domain()[1]);
        })
        .attr('height', function(d) {
            return yScale(yScale.domain()[0]);
        })
        .style('fill', function(d) {
            return '#f3f3f3';
        });

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
    chartElement.append('line')
        .attr('class', 'y grid grid-0')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0));
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
