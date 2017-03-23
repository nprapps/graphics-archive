// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var segregatedData = SEGREGATED_DATA;
var nonSegregatedData = NON_SEGREGATED_DATA;

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
var loadLocalData = function() {
    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    _.each([segregatedData, nonSegregatedData], function(graphicData) {
        graphicData.forEach(function(d) {
            d['amt'] = +d['amt'] * 100;
        });
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth > 700) {
        containerWidth = 700;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    var size = Math.floor((containerWidth - 40) / 2) - 1;

    // console.log(size);

    d3.select('.chart-wrapper.left')
        .style('width', size + 40 + 'px')

    // Render the chart!
    renderColumnChart({
        container: '#segregated',
        width: size + 40,
        height: size * 9 / 16,
        data: segregatedData,
        margins: {
            top: 5,
            right: 10,
            bottom: 20,
            left: 40
        },
        yAxis: true
    });

    d3.select('.chart-wrapper.right')
        .style('width', size + 'px')

    renderColumnChart({
        container: '#non-segregated',
        width: size,
        height: size * 9 / 16,
        data: nonSegregatedData,
        margins: {
            top: 5,
            right: 5,
            bottom: 20,
            left: 5
        },
        yAxis: false
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
    var valueColumn = 'amt';

    var aspectWidth = 16;
    var aspectHeight = 9;
    var valueMinHeight = 30;

    var margins = {
        top: config['margins']['top'],
        right: config['margins']['right'],
        bottom: config['margins']['bottom'],
        left: config['margins']['left']
    };

    var ticksY = 3;
    var roundTicksFactor = 50;

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
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var yScale = d3.scale.linear()
        .domain([0, 100])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (i == 0 || i == config.data.length - 1) {
                return d;
            }

            return '';
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            }

            return d + '%';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    if (config['yAxis'] == true) {
        chartElement.append('g')
            .attr('class', 'y axis')
            .call(yAxis)
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

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', function(d) {
                var y = yScale(d[valueColumn]);

                // if (chartHeight - y > valueMinHeight) {
                //     return y + 15;
                // }

                return y - 6;
            })
            .attr('text-anchor', 'middle')
            .attr('class', function(d) {
                var c = 'y-' + classify(d[labelColumn]);

                // if (chartHeight - yScale(d[valueColumn]) > valueMinHeight) {
                //     c += ' in';
                // } else {
                //     c += ' out';
                // }

                c += ' out';

                return c;
            })
            .text(function(d) {
                return d[valueColumn].toFixed(1) + '%';
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
