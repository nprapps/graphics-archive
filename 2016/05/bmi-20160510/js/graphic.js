// Global vars
var pymChild = null;
var isMobile = false;
var SIDEBAR_THRESHOLD = 280;

var weightCategories = [ 'Underweight', 'Normal', 'Overweight', 'Obese' ];

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
        d['min'] = +d['min'];
        d['max'] = +d['max'];
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

    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // Render the chart!
    renderColumnChart({
        container: '#column-chart',
        width: containerWidth,
        data: DATA
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
    if (isSidebar) {
        labelColumn = 'label_short';
    }
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 4 : 9;
    // if (isSidebar) {
    //     aspectHeight = 4;
    // }
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 1,
        bottom: 20,
        left: 75
    };

    if (isSidebar) {
        margins['left'] = 65;
    }

    var ticksY = [ 13.5, 18.5, 25, 30, 35 ];
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

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
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var min = ticksY[0];
    var max = ticksY[ticksY.length - 1];

    var yScale = d3.scale.linear()
        .domain([ min, max ])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickValues(ticksY)
        .tickFormat(function(d, i) {
            if (i > 0 && i <= (ticksY.length - 2)) {
                return 'BMI ' + d.toFixed(1);
            }
        });

    // range bars
    var bgBars = chartElement.append('g')
        .attr('class', 'bg-bars')
        .selectAll('rect')
        .data(ticksY.filter(function(d,i) {
            return i < (ticksY.length - 1);
        }))
        .enter();

    bgBars.append('rect')
        .attr('x', 0)
        .attr('width', chartWidth)
        .attr('y', function(d, i) {
            return yScale(ticksY[i + 1]);
        })
        .attr('height', function(d, i) {
            return yScale(ticksY[i]) - yScale(ticksY[i + 1]);
        })
        .attr('class', function(d,i) {
            return 'bar wide bar-' + i;
        });

    bgBars.append('rect')
        .attr('x', 0)
        .attr('width', (xScale.rangeBand() / 16))
        .attr('y', function(d, i) {
            return yScale(ticksY[i + 1]);
        })
        .attr('height', function(d, i) {
            return yScale(ticksY[i]) - yScale(ticksY[i + 1]);
        })
        .attr('class', function(d,i) {
            return 'bar side bar-' + i;
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
    var rangeBars = chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('line')
        .data(config['data'])
        .enter();

    rangeBars.append('rect')
        .attr('x', function(d) {
            return xScale(d[labelColumn]) + ((xScale.rangeBand() - (xScale.rangeBand() / 8)) / 2);
        })
        .attr('y', function(d) {
            return yScale(d['max']);
        })
        .attr('width', function(d) {
            return (xScale.rangeBand() / 8);
        })
        .attr('height', function(d) {
            return yScale(d['min']) - yScale(d['max']);
        })
        .attr('class', function(d) {
            return 'bar bar-' + d['label'];
        });

    rangeBars.append('line')
        .attr('x1', function(d) {
            return xScale(d[labelColumn]) + (xScale.rangeBand() / 2) - (xScale.rangeBand() / 16);
        })
        .attr('y1', function(d) {
            return yScale(d[valueColumn]);
        })
        .attr('x2', function(d) {
            return xScale(d[labelColumn]) + (xScale.rangeBand() / 2) + (xScale.rangeBand() / 16);
        })
        .attr('y2', function(d) {
            return yScale(d[valueColumn]);
        })
        .attr('class', function(d) {
            return 'bar bar-' + d['label'];
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
                return d[valueColumn].toFixed(1);
            })
            .attr('x', function(d, i) {
                if (isSidebar) {
                    return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
                } else {
                    return xScale(d[labelColumn]) + (xScale.rangeBand() / 2) + (xScale.rangeBand() / 8);
                }
            })
            .attr('y', function(d) {
                if (isSidebar) {
                    return yScale(d['max']) - 6;
                } else {
                    return yScale(d['amt']) + 3;
                }
            });

    // bmi range labels
    chartElement.append('g')
        .attr('class', 'range-labels')
        .selectAll('text')
        .data(weightCategories)
        .enter()
            .append('text')
                .text(function(d) {
                    return d;
                })
                .attr('x', -10)
                .attr('y', function(d,i) {
                    var rangePos = (ticksY[i] + ticksY[i + 1]) / 2;
                    return yScale(rangePos);
                })
                .attr('dy', function(d) {
                    if (d == 'Underweight') {
                        return 6;
                    } else {
                        return 3;
                    }
                })
                .attr('class', function(d,i) {
                    return 'label label-' + i + ' ' + classify(d);
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
