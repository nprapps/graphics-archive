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
        d['avg'] = +d['avg'];
        d['min'] = +d['min'];
        d['max'] = +d['max'];
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
    var labelColumn = 'year';
    var valueColumn = 'avg';
    var minColumn = 'min';
    var maxColumn = 'max';

    var barHeight = 20;
    var barGap = 5;
    var labelWidth = 60;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;

    var margins = {
        top: 0,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = [ -60, -30, 0, 30, 60 ];
    var roundTicksFactor = 5;

    if (isMobile) {
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
    var xScale = d3.scale.linear()
        .domain([ -60, 60 ])
        .range([ 0, chartWidth ]);

    var years = _.pluck(config['data'], labelColumn);
    years = d3.set(years).values().reverse();

    var yScale = d3.scale.ordinal()
        .domain(years)
        .rangeRoundBands([chartHeight, 0]);

    // console.log(yScale.rangeBand());

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
                return xScale(d[minColumn]);
            })
            .attr('x2', function(d, i) {
                return xScale(d[maxColumn]);
            })
            .attr('y1', function(d, i) {
                return yScale(d['year']) + Math.floor(yScale.rangeBand() / 2);
            })
            .attr('y2', function(d, i) {
                return yScale(d['year']) + Math.floor(yScale.rangeBand() / 2);
            });

    /*
     * Render dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d[valueColumn]);
            })
            .attr('cy', function(d, i) {
                return yScale(d['year']) + Math.floor(yScale.rangeBand() / 2);
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
                    'height': yScale.rangeBand() + 'px',
                    'left': '0px',
                    'top': yScale(d['year']) + 'px;'
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
//     _.each(['shadow', 'value'], function(cls) {
//         chartElement.append('g')
//             .attr('class', cls)
//             .selectAll('text')
//             .data(config['data'])
//             .enter().append('text')
//                 .attr('x', function(d, i) {
//                     return xScale(d[maxColumn]) + 6;
//                 })
//                 .attr('y', function(d,i) {
//                     return i * (barHeight + barGap) + (barHeight / 2) + 3;
//                 })
//                 .text(function(d) {
//                     return d[valueColumn].toFixed(1) + '%';
//                 });
//     });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
