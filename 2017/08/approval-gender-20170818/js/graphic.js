// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
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
        d['wmn'] = +d['wmn'];
        d['men'] = +d['men'];
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
    renderDotChart({
        container: '#graphic',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a chart.
 */
var renderDotChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'wmn';
    var valueColumn2 = 'men';

    var barHeight = 22;
    var barGap = 5;
    var labelWidth = 70;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;
    var domainX = [ 20, 80 ];

    var margins = {
        top: 0,
        right: 40,
        bottom: 40,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 6;
    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 3;
//        labelMargin = 60;
        margins['left'] = (labelWidth + labelMargin);
        margins['right'] = 70;
        margins['bottom'] = 55;
//        domainX = [ 0, 100 ];
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

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
    var min = 0;
    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn2] / roundTicksFactor) * roundTicksFactor;
    });

    var xScale = d3.scale.linear()
        .domain(domainX)
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return Math.abs(d) + '%';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append("text")
        .attr("class", "x axis-label")
        .attr("text-anchor", "middle")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 35)
        .text("Approval in mid-August of first year")
        .call(wrapText, chartWidth, 13);

    /*
     * Render gray box to chart.
     */

     chartElement.append('rect')
        .attr('class', 'bg')
        .attr('x', xScale(xScale.domain()[0]))
        .attr('width', xScale(xScale.domain()[1]))
        .attr('y', (9 * (barHeight + barGap)) - (barGap/2))
        .attr('height', chartHeight + barGap - (9 * (barHeight + barGap)) - (barGap/2))
        .attr('fill', '#f1f1f1');

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
     * Render annotations to chart.
     */

    //  var annotations = chartElement.append('g')
    //     .attr('class', 'annotations');
    //
    // annotations.append('text')
    //     .attr('class', 'label-top')
    //     .attr('x', xScale(0))
    //     .attr('dx', -10)
    //     .attr('text-anchor', 'end')
    //     .attr('y', -10)
    //     .html(LABELS['annotation_one'])
    //
    // annotations.append('text')
    //     .attr('class', 'label-top')
    //     .attr('x', xScale(0))
    //     .attr('dx', 10)
    //     .attr('text-anchor', 'beginning')
    //     .attr('y', -10)
    //     .html(LABELS['annotation_two'])

    /*
     * Render zero line to chart.
     */

     chartElement.append('line')
        .attr('class', 'x grid grid-0')
        .attr('x1', xScale(20))
        .attr('x2', xScale(20))
        .attr('y1', 0)
        .attr('y2', chartHeight);

    /*
     * Render range bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', function(d, i) {
                return xScale(d[valueColumn]);
            })
            .attr('x2', function(d, i) {
                return xScale(d[valueColumn2]);
            })
            .attr('y1', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('y2', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            });

    /*
     * Render dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots wmn')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d[valueColumn]);
            })
            .attr('cy', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('r', dotRadius)

    chartElement.append('g')
        .attr('class', 'dots men')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d[valueColumn2]);
            })
            .attr('cy', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('r', dotRadius)

    /*
     * Render bar labels.
     */
    containerElement
        .append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
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
                .text(function(d) {
                    return d[labelColumn];
                });

    /*
     * Render bar values.
     */
    _.each(['shadow', 'value'], function(cls) {
        chartElement.append('g')
            .attr('class', cls + ' wmn')
            .selectAll('text')
            .data(config['data'])
            .enter().append('text')
                .attr('x', function(d, i) {
                    if (d[valueColumn] > d[valueColumn2]) {
                        return xScale(d[valueColumn]) + 8;
                    } else {
                        return xScale(d[valueColumn]) - 8;
                    }
                })
                .attr('y', function(d,i) {
                    return i * (barHeight + barGap) + (barHeight / 2) + 3;
                })
                .attr('text-anchor', function(d, i) {
                    if (d[valueColumn] > d[valueColumn2]) {
                        return 'begin';
                    } else {
                        return 'end';
                    }
                })
                .text(function(d, i) {
                    var val = Math.abs(d[valueColumn]);
                    if (i == 0) {
                        if (d[valueColumn] > d[valueColumn2]) {
                            val = val + '% - Women';
                        } else {
                            val = 'Women - ' + val + '%';
                        }
                    }
                    return val;
                });
    });

    _.each(['shadow', 'value'], function(cls) {
        chartElement.append('g')
            .attr('class', cls + ' men')
            .selectAll('text')
            .data(config['data'])
            .enter().append('text')
                .attr('x', function(d, i) {
                    if (d[valueColumn2] > d[valueColumn]) {
                        return xScale(d[valueColumn2]) + 8;
                    } else if (d[valueColumn2] == d [valueColumn]) {
                            return xScale(d[valueColumn]) + 20;
                    } else {
                        return xScale(d[valueColumn2]) - 8;
                    }
                })
                .attr('y', function(d,i) {
                    return i * (barHeight + barGap) + (barHeight / 2) + 3;
                })
                .attr('text-anchor', function(d, i) {
                    if (d[valueColumn2] > d[valueColumn]) {
                        return 'begin';
                    } else {
                        return 'end';
                    }
                })
                .text(function(d, i) {
                    var val = Math.abs(d[valueColumn2]);
                    if (i == 0) {
                        if (d[valueColumn2] > d[valueColumn]) {
                            val = val + '%. - Men';
                        } else {
                            val = 'Men - ' + val + '%';
                        }
                    }
                    return val;
                });
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
