// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

/*
 * Initialize the graphic.
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
        d['black'] = +d['black'];
        d['white'] = +d['white'];
        d['gap'] = +d['gap'];
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
    renderDotChart({
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
 * Render a bar chart.
 */
var renderDotChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 50;
    var barGap = 3;
    var labelWidth = 200;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;
    var valueOffset = dotRadius + 3;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = [ 0, 20, 40, 60, 80, 100 ];
    var roundTicksFactor = 5;

    if (isMobile) {
        barHeight = 70;
        labelWidth = 120;
        ticksX = [ 0, 25, 50, 75, 100 ];
        margins['left'] = (labelWidth + labelMargin);
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
    var xScale = d3.scale.linear()
        .domain([ 0, 100 ])
        .range([ 0, chartWidth ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(ticksX)
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

    // row backgrounds
    chartElement.append('g')
        .attr('class', 'bg')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', xScale(0))
            .attr('width', chartWidth)
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight);

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
        .attr('class', 'bars')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', function(d, i) {
                return xScale(d['white']);
            })
            .attr('x2', function(d, i) {
                return xScale(d['black']);
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
        .attr('class', 'dots black')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['black']);
            })
            .attr('cy', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('r', dotRadius)

    chartElement.append('g')
        .attr('class', 'dots white')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['white']);
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
                .html(function(d) {
                    return d[labelColumn];
                });

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'white ' + 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('class', 'white')
            .attr('x', function(d, i) {
                return xScale(d['white']);
            })
            .attr('y', function(d,i) {
                return i * (barHeight + barGap) + (barHeight / 2) + 3;
            })
            .attr('dx', function(d) {
                if (d['gap'] > 0) {
                    return -valueOffset;
                } else {
                    return valueOffset;
                }
            })
            .attr('text-anchor', function(d) {
                if (d['gap'] > 0) {
                    return 'end';
                } else {
                    return 'begin';
                }
            })
            .text(function(d) {
                return d['white'].toFixed(0) + '%';
            });

    chartElement.append('g')
        .attr('class', 'black ' + 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('class', 'black')
            .attr('x', function(d, i) {
                return xScale(d['black']);
            })
            .attr('y', function(d,i) {
                return i * (barHeight + barGap) + (barHeight / 2) + 3;
            })
            .attr('dx', function(d) {
                if (d['gap'] > 0) {
                    return valueOffset;
                } else {
                    return -valueOffset;
                }
            })
            .attr('text-anchor', function(d) {
                if (d['gap'] > 0) {
                    return 'begin';
                } else {
                    return 'end';
                }
            })
            .text(function(d) {
                return d['black'].toFixed(0) + '%';
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
