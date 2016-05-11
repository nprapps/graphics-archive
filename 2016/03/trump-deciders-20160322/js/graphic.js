// Global vars
var pymChild = null;
var isMobile = false;
var stateValues = [];

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
}

/*
 * Format graphic data for processing by D3.
 */
 var formatData = function() {
    DATA.forEach(function(d) {
        var values = [];
        for (key in d) {
            if (key != 'label') {
                d[key] = +d[key];

                values.push({ 'state': key, 'value': d[key] });
            }
        }
        stateValues.push({ 'key': d['label'], 'values': values });
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
        data: stateValues
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
    var labelColumn = 'key';
    // var valueColumn = d['state'];

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 60;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;

    var margins = {
        top: 30,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 6;
        margins['right'] = 30;
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
    var min = -40;
    var max = 40;
    // var max = d3.max(config['data'], function(d) {
    //     return Math.ceil(d[maxColumn] / roundTicksFactor) * roundTicksFactor;
    // });

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
        .tickFormat(function(d) {
            return d + '%';
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
     * Render range bars to chart.
     */
    // chartElement.append('g')
    //     .attr('class', 'bars')
    //     .selectAll('line')
    //     .data(config['data'])
    //     .enter()
    //     .append('line')
    //         .attr('x1', function(d, i) {
    //             return xScale(d[minColumn]);
    //         })
    //         .attr('x2', function(d, i) {
    //             return xScale(d[maxColumn]);
    //         })
    //         .attr('y1', function(d, i) {
    //             return i * (barHeight + barGap) + (barHeight / 2);
    //         })
    //         .attr('y2', function(d, i) {
    //             return i * (barHeight + barGap) + (barHeight / 2);
    //         });

    /*
     * Render dots to chart.
     */
    var candidateDots = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('.candidate-dots')
        .data(config['data'])
        .enter().append('g')
            .attr('class', function(d) {
                return classify('candidate-dots ' + d['key']);
            })
            .attr('transform', function(d,i) {
                return makeTranslate(0, (i * (barHeight + barGap)));
            });

    candidateDots.selectAll('circle')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['value']);
            })
            .attr('cy', function(d, i) {
                return (barHeight / 2);
            })
            .attr('r', dotRadius);

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
         * Render annotations
         */

        var annotations = chartElement.append('g')
            .attr('class', 'annotations');

        annotations.append('text')
            .attr('class', 'label-top')
            .attr('x', xScale(0))
            .attr('dx', -10)
            .attr('text-anchor', 'end')
            .attr ('y', -20)
            .html(LABELS['annotation_1']);

        annotations.append('text')
            .attr('class', 'label-top')
            .attr('x', xScale(0))
            .attr('dx', -10)
            .attr('text-anchor', 'end')
            .attr ('y', -5)
            .html(LABELS['annotation_3']);

        annotations.append('text')
            .attr('class', 'label-top')
            .attr('x', xScale(0))
            .attr('dx', 10)
            .attr('text-anchor', 'beginning')
            .attr ('y', -20)
            .html(LABELS['annotation_2']);

        annotations.append('text')
            .attr('class', 'label-top')
            .attr('x', xScale(0))
            .attr('dx', 10)
            .attr('text-anchor', 'beginning')
            .attr ('y', -5)
            .html(LABELS['annotation_4']);
    /*
     * Render bar values.
     */
    // _.each(['shadow', 'value'], function(cls) {
    //     chartElement.append('g')
    //         .attr('class', cls)
    //         .selectAll('text')
    //         .data(config['data'])
    //         .enter().append('text')
    //             .attr('x', function(d, i) {
    //                 return xScale(d[maxColumn]) + 6;
    //             })
    //             .attr('y', function(d,i) {
    //                 return i * (barHeight + barGap) + (barHeight / 2) + 3;
    //             })
    //             .text(function(d) {
    //                 return d[valueColumn].toFixed(1) + '%';
    //             });
    // });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
