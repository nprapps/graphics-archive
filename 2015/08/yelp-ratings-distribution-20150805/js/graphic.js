// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
var fmtComma = d3.format(',');

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
        d['health'] = +d['health'];
        d['overall'] = +d['overall'];
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
    renderColumnChart({
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
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'health';

    var aspectWidth = 16;
    var aspectHeight = 9;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 37
    };

    var ticksY = 4;
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
    
    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var yScale = d3.scale.linear()
        .domain([
            min,
            d3.max(config['data'], function(d) {
                return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
            })
        ])
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
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d) + '%';
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
        .attr('class', 'zero-line')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0));

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .x(function(d) {
            return d['x'];
        })
        .y(function(d) {
            return d['y'];
        });

    var coordinates = [];
    for (var i = 0; i < config['data'].length; i++) {
        d = config['data'][i];
        var gutter = (xScale.rangeBand() * .1) / 2;
        coordinates.push({ 'x': xScale(d['label']) - gutter,
                           'y': yScale(d['overall']) });
        coordinates.push({ 'x': xScale(d['label']) + xScale.rangeBand() + gutter,
                           'y': yScale(d['overall']) });
        
        if (i != (config['data'].length - 1)) {
            coordinates.push({ 'x': xScale(d['label']) + xScale.rangeBand() + gutter,
                               'y': yScale(config['data'][(i + 1)]['overall']) });
        }
    }

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data([coordinates])
        .enter().append('path')
            .attr('class', 'overall')
            .attr('d', line(coordinates));
    
    /*
     * annotations
     */
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');
        
    annotations.append('line')
        .attr('x1', xScale(xScale.domain()[4]) + (xScale.rangeBand()/2))
        .attr('x2', xScale(xScale.domain()[4]) + (xScale.rangeBand()/2))
        .attr('y1', yScale(config['data'][4]['health']) - 15)
        .attr('y2', yScale(config['data'][4]['health']))
    
    annotations.append('text')
        .attr('x', xScale(xScale.domain()[4]) + (xScale.rangeBand()/2))
        .attr('y', yScale(config['data'][4]['health']) - 22)
        .attr('dx', 3)
        .text('Ratings of health providers');

    annotations.append('line')
        .attr('x1', xScale(xScale.domain()[3]) + (xScale.rangeBand()/2))
        .attr('x2', xScale(xScale.domain()[3]) + (xScale.rangeBand()/2))
        .attr('y1', yScale(config['data'][3]['overall']) - 15)
        .attr('y2', yScale(config['data'][3]['overall']))
    
    annotations.append('text')
        .attr('x', xScale(xScale.domain()[3]) + (xScale.rangeBand()/2))
        .attr('y', yScale(config['data'][3]['overall']) - 22)
        .attr('dx', 3)
        .text('Ratings across all categories');

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
