// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var colorScale = null;

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
        d['sat_fat'] = +d['sat_fat'];
        d['sodium'] = +d['sodium'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }
    
    var graphicWidth = containerWidth;
    
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        graphicWidth = Math.floor((containerWidth - 5) / 2);
        isMobile = false;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');
    
    // Extract categories from data
    var categories = [];
    _.each(graphicData, function(d) {
        if (d['label'] != null) {
            categories.push(d['label']);
        }
    });
    categories = d3.set(categories).values();

    // Define color scale
//     var colorScale = d3.scale.ordinal()
//         .domain(categories);

    // render the key
//     renderKey({
//         container: '#graphic',
//         data: graphicData,
//         scale: colorScale
//     });

    // Render the chart!
    renderColumnChart({
        container: '#graphic',
        width: graphicWidth,
        data: graphicData,
        val: 'sodium',
        title: HDR_SODIUM,
        units: UNITS_SODIUM,
        scale: colorScale,
        range: [ COLORS['red1'], COLORS['red3'], COLORS['red5'] ]
    });

    renderColumnChart({
        container: '#graphic',
        width: graphicWidth,
        data: graphicData,
        val: 'sat_fat',
        title: HDR_SAT_FAT,
        units: UNITS_SAT_FAT,
        scale: colorScale,
        range: [ COLORS['orange2'], COLORS['orange3'], COLORS['orange5'] ]
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render key
 */
var renderKey = function(config) {
    // Define container element
    var containerElement = d3.select(config['container']);

    // Create legend
    var legendElement = containerElement.append('ul')
        .classed('key', true);

    _.each(config['scale'].domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', config['scale'](key));

        keyItem.append('label')
            .text(key);
    });
}

/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = config['val'];

    var aspectWidth = isMobile ? 16 : 4;
    var aspectHeight = isMobile ? 9 : 3;
    var valueMinHeight = 30;
    
    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 57
    };

    var ticksY = 4;
    var roundTicksFactor = 5;
    switch(config['val']) {
        case 'sat_fat':
            roundTicksFactor = 10;
            break;
        case 'sodium':
            roundTicksFactor = 1000;
            break;
    }
    
//     config['scale'].range(config['range']);

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Define container element
    var containerElement = d3.select(config['container']);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper ' + classify(config['val']))
        .attr('style', 'width: ' + config['width'] + 'px;');

    chartWrapper.append('h3')
        .attr('style', 'margin-left: ' + margins['left'] + 'px;')
        .text(config['title']);

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
        .domain([0, d3.max(config['data'], function(d) {
            return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })])
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
            if (d != 0) {
                return fmtComma(d) + ' ' + config['units'];
            } else {
                return d;
            }
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
//             .attr('fill', function(d) {
//                 return config['scale'](d[labelColumn]);
//             })
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

                if (chartHeight - y > valueMinHeight) {
                    return y + 15;
                }

                return y - 6;
            })
            .attr('text-anchor', 'middle')
            .attr('class', function(d) {
                var c = 'y-' + classify(d[labelColumn]);

                if (chartHeight - yScale(d[valueColumn]) > valueMinHeight) {
                    c += ' in';
                } else {
                    c += ' out';
                }

                return c;
            })
            .text(function(d) {
                var val = '';
                switch(config['val']) {
                    case 'sodium':
                        val += fmtComma(d[valueColumn].toFixed(0));
                        break;
                    default:
                        val += fmtComma(d[valueColumn].toFixed(1));
                        break;
                }
                return val + ' ' + config['units'];
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
