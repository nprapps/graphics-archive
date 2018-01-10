// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize graphic
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
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Format graphic data for processing by D3.
 */
 var formatData = function() {
     DATA.forEach(function(d) {
         d['approval_one_year'] = +d['approval_one_year'];
         d['seat_change'] = +d['seat_change'];

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
    renderLineChart({
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
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var xColumn = 'approval_one_year';
    var yColumn = 'seat_change';

    var aspectWidth = 4;
    var aspectHeight = 3;

    var margins = {
        top: 5,
        right: 25,
        bottom: 60,
        left: 45
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        aspectWidth = 1;
        aspectHeight = 1;
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 35;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */

    var xScale = d3.scale.linear()
        .domain([ 30, 90 ])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ -80, 20 ])
        .range([ chartHeight, 0 ]);

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
     * Create SVG filters.
     */
    var filters = chartElement.append('filters');

    var textFilter = filters.append('filter')
        .attr('id', 'textshadow');

    textFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('result', 'blurOut')
        .attr('stdDeviation', '.25');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d + '%'
        })

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d;
        })

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

    chartElement.append('text')
        .attr('class', 'x axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 35)
        .text(LABELS['label_approval'])
        .call(wrapText, chartWidth, 14);

    chartElement.append('text')
        .attr('class', 'y axis-label')
        .attr('text-anchor', 'middle')
        .attr('y', -(margins['left'] - 3))
        .attr('dy', '.75em')
        .attr('x', -(chartHeight / 2))
        .attr('transform', 'rotate(-90)')
        .text(LABELS['label_seats_lost']);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render 0 value line.
     */
    chartElement.append('line')
        .attr('class', 'zero-line')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0));

    /*
     * Add best-fit line.
     */
    chartElement.append('line')
        .attr('x1', xScale(xScale.domain()[0]))
        .attr('y1', yScale(-52))
        .attr('x2', xScale(xScale.domain()[1]))
        .attr('y2', yScale(-12))
        .style('stroke', '#bbb')
        .style('stroke-width', '2');

    /*
     * Render dots to chart.
     */
     chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('fill', function(d) {
                if (d[yColumn] < 0) {
                    return COLORS['red3'];
                } else {
                    return '#333';
                }
            })
            .attr('r', 4)
            .attr('cx', function(d) {
                return xScale(d[xColumn]);
            })
            .attr('cy', function(d) {
                return yScale(d[yColumn]);
            })
            .attr('class', function(d) {
                if (d['highlight'] && isMobile) {
                    return 'highlight';
                }
            });

    /*
     * Render labels.
     */
    var highlights = config['data'];
    if (isMobile) {
        highlights = _.filter(config['data'], function(d) {
            return d['highlight'] !== null;
        });
    };

    chartElement.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(highlights)
        .enter().append('text')
            .attr('x', function(d) {
                var offset = 8;
                if (_.contains([ '1970', '1978', '2002'], d['year'])) {
                    d3.select(this).attr('style', 'text-anchor: end;')
                    offset = -8;
                }
                return xScale(d[xColumn]) + offset;
            })
            .attr('y', function(d) {
                var offset = -3;
                if (_.contains([ '1978', '1990'], d['year'])) {
                    offset = 6;
                }
                return yScale(d[yColumn]) + offset;
            })
            .text(function(d) {
                if (d['note']) {
                    return d['note'];
                } else {
                    if (isMobile) {
                        return d['year'] + ' (' + d['president'] + ')';
                    } else {
                        return d['year'] + ' (' + d['president'] + ')';
                    }
                }
            });
 }

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
