// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
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
        d['x'] = +d['x']
        d['y'] = +d['y']
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
    var xColumn = 'x';
    var yColumn = 'y';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 75,
        bottom: 40,
        left: 30
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
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
        .domain([ 0, 1 ])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ 0, 1 ])
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
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(2)
        .tickFormat(function(d) {
            if (d == 0.5) {
                return 't*';
            }

            return (d * 100) + '%';
        })

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(0);

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
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .interpolate('basis')
        .x(function(d) {
            return xScale(d[xColumn]);
        })
        .y(function(d) {
            return yScale(d[yColumn]);
        });

    chartElement
        .append('path')
            .data([config['data']])
            .attr('class', 'curve')
            .attr('stroke', COLORS['teal3'])
            .attr('d', line)

    /*
     * Render y-axis label.
     */
    chartElement
        .append('text')
            .text('Government revenue')
            .attr('class', 'y-label')
            // .attr('x', 0)
            // .attr('y', function() {
            //     var textHeight = d3.select(this).node().getBBox().height;
            //
            //     return margins['left'] + chartWidth / 2 - textWidth / 2;
            // })
            .attr('text-anchor', 'middle')
            .attr('transform', function(d) {
                var x = -10;
                var textWidth = d3.select(this).node().getBBox().width;
                var y = margins['top'] + chartHeight / 2;

                return 'translate(' + x + ',' + y + ')rotate(270)'
            });

    /*
     * Render x-axis label.
     */
    chartElement
        .append('text')
            .text('Tax rate')
            .attr('class', 'x-label')
            .attr('x', function() {
                var textWidth = d3.select(this).node().getBBox().width;

                return margins['left'] + chartWidth / 2 - textWidth / 2;
            })
            .attr('y', margins['top'] + chartHeight + 30)
            .attr('text-anchor', 'middle');
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
