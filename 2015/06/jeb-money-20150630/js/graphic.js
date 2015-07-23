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
        d['label'] = d3.time.format('%Y').parse(d['label']);
        d['amt'] = +d['amt'];
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
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;
    var valueMinHeight = 30;

    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 70
    };

    var ticksY = 6;
    var roundTicksFactor = 500000;

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

    // Extract categories from data (stolen from map template)
    var categories = [];

    _.each(config['data'], function(d) {
        if (d['governor'] != null) {
            categories.push(d['governor']);
        }
    });
    // groups all "before governor"s into one bunch
    categories = d3.set(categories).values();
    // Define color scale ... .domain(categories) tells computer we have 3 categories that need colors
    var colorScale = d3.scale.ordinal()
        .domain(categories)
        .range([ COLORS['teal5'], COLORS['teal3'], COLORS['teal1'] ]);

    // Create legend -- colorScale.domain is same as categories above
    var legendElement = chartWrapper.append('div')
        .attr('class', 'key');
    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(key);
    });

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
        .domain([
            d3.min(config['data'], function(d) {
                return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
            }),
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
            if (!isMobile && i % 2 == 0) {
                return '\u2019' + fmtYearAbbrev(d);
            } else if (isMobile && i % 4 == 0) {
                return '\u2019' + fmtYearAbbrev(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return ("$" + fmtComma(d));
        });
    // drawing background box
/*
    chartElement.append('rect')
        .attr('x', xScale(d3.time.format('%Y').parse('1999') ) )
        .attr('y', 0)
        .attr('height', chartHeight)
        .attr('width', xScale(d3.time.format('%Y').parse('2007')) - xScale(d3.time.format('%Y').parse('1999')))
        .attr('fill', '#f1f1f1');
*/
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
            // passing data from governor to colorScale
            .attr('fill', function(d) {
                return colorScale(d['governor']);
            })
            // in this case don't need below code...there for when you want to highlight one bar
            .attr('class', function(d) {
                return 'bar bar-' + d[labelColumn] + ' ' + classify(d['governor']);
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
     /*
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
                return d[valueColumn].toFixed(0);
            });

            */
}
/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
