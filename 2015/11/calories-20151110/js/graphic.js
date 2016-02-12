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
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['1970'] = +d['1970'];
        d['2010'] = +d['2010'];
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
        container: '#dot-chart',
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
var renderDotChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    // var valueColumn = 'amt';
    var minColumn = 'min';
    var maxColumn = 'max';

    var barHeight = 20;
    var barGap = 5;
    var labelWidth = 110;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;

    if (isMobile) {
        labelWidth = 60;
        barHeight = 30;
    }

    var margins = {
        top: 0,
        right: 95,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 6;
    var roundTicksFactor = 50;

    if (isMobile) {
        ticksX = 3;
        margins['right'] = 100;
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
        return Math.ceil(d['2010'] / roundTicksFactor) * roundTicksFactor;
    });
    // var max = 40;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX);

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
     * Render range bars to chart.
     */
     chartElement.append('g')
         .attr('class', 'guidelines')
         .selectAll('line')
         .data(config['data'])
         .enter()
         .append('line')
             .attr('x1', function(d, i) {
                 return xScale(0);
             })
             .attr('x2', function(d, i) {
                 if (d['2010'] < d['1970']) {
                     return xScale(d['2010']);
                 } else {
                     return xScale(d['1970']);
                 }
             })
             .attr('y1', function(d, i) {
                 return i * (barHeight + barGap) + (barHeight / 2);
             })
             .attr('y2', function(d, i) {
                 return i * (barHeight + barGap) + (barHeight / 2);
             });

    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', function(d, i) {
                return xScale(d['1970']);
            })
            .attr('x2', function(d, i) {
                return xScale(d['2010']);
            })
            .attr('y1', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('y2', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('class', function(d) {
                return classify(d['status']);
            })

    /*
     * Render dots to chart.
     */
    //  chartElement.append('g')
    //      .attr('class', 'dots y-2002')
    //      .selectAll('circle')
    //      .data(config['data'])
    //      .enter().append('circle')
    //          .attr('cx', function(d, i) {
    //              return xScale(d['1970']);
    //          })
    //          .attr('cy', function(d, i) {
    //              return i * (barHeight + barGap) + (barHeight / 2);
    //          })
    //          .attr('r', 4)

    chartElement.append('g')
        .attr('class', 'dots y-2013')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('class', function(d, i) {
                return classify(d['status']);
            })
            .attr('cx', function(d, i) {
                return xScale(d['2010']);
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
                return classify(d[labelColumn]) + ' ' + classify(d['status']);
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
            .attr('class', cls)
            .selectAll('text')
            .data(config['data'])
            .enter().append('text')
                .attr('x', function(d, i) {
                    return xScale(d['2010']);
                })
                .attr('dx', function(d) {
                    if (d['status'] == 'decreased' && d['2010'] > 150) {
                        return -8;
                    } else {
                        return 8;
                    }
                })
                .attr('text-anchor', function(d) {
                    if (d['status'] == 'decreased' && d['2010'] > 150) {
                        return 'end';
                    } else {
                        return 'begin';
                    }
                })
                .attr('y', function(d,i) {
                    return i * (barHeight + barGap) + (barHeight / 2) + 4;
                })
                .text(function(d) {
                    var diff = d['2010'] - d['1970'];
                    if (diff > 0) {
                        diff = '+' + diff;
                    }
                    return d['2010'].toFixed(0) + ' calories (' + diff + ')';
                });
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
