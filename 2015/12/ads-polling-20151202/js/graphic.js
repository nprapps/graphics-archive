// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
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
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        graphicData = data;

        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    graphicData.forEach(function(d) {
        // console.log(d);
        d['spending'] = +d['spending'];
        d['polling'] = +d['polling'];

    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
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
        data: graphicData
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
    var xColumn = 'spending';
    var yColumn = 'polling';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 25,
        bottom: 40,
        left: 70
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 30;
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
        .domain([0, 30])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ 0, 30 ])
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
            return '$' + d + 'M'
        })

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d + '%'
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

    chartElement.append("text")
        .attr("class", "x axis-label")
        .attr("text-anchor", "middle")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 35)
        .text("Ad Spending");

    chartElement.append("text")
        .attr("class", "y axis-label")
        .attr("text-anchor", "middle")
        .attr("y", -60)
        .attr("dy", ".75em")
        .attr("x", -(chartHeight / 2))
        .attr("transform", "rotate(-90)")
        .text("RCP National Polling Average (%)");

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
     * Render dots to chart.
     */
     chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('fill', function(d) {
                if (d['highlight']) {
                    return COLORS['red2'];
                }

                return COLORS['blue3']
            })
            .attr('r', 4)
            .attr('cx', function(d) {
                return xScale(d[xColumn]);
            })
            .attr('cy', function(d) {
                return yScale(d[yColumn]);
            })
            .attr('class', function(d) {
                if (d['highlight']) {
                    return 'highlight';
                }

                return '';
            });

    /*
     * Add text shadow.
     */

    /*
     * Render labels.
     */
    var highlights = _.filter(config['data'], function(d) {
        return d['highlight'] !== null;
    })

    chartElement.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(highlights)
        .enter().append('text')
            .attr('x', function(d) {
                if (d['candidate'] === 'Christie') {
                    return xScale(d[xColumn]) - 5;
                } else {
                    return xScale(d[xColumn]) + 8;

                }
            })
            .attr('y', function(d) {
                if (d['candidate'] === 'Christie') {
                    return yScale(d[yColumn]) - 10;
                } else {
                    return yScale(d[yColumn]) - 0;
                }
            })
            .attr('dx', function(d) {
                if (isMobile) {
                    switch(d['candidate']) {
                        case 'Paul':
                            return -10;
                            break;
                        default:
                            return 0;
                            break;
                    }
                }
            })
            .attr('dy', function(d) {
                if (isMobile) {
                    switch(d['candidate']) {
                        case 'Christie':
                            return 0;
                            break;
                        case 'Kasich':
                            return 8;
                            break;
                        case 'Paul':
                            return -8;
                            break;
                        default:
                            return 0;
                            break;
                    }
                }
            })
            .text(function(d) {
                return d['candidate'];
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
