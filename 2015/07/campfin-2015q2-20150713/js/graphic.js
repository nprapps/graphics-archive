// Global config
var GRAPHIC_DEFAULT_WIDTH = 730;
var MOBILE_THRESHOLD = 600;
var DATA_COLS = [ 'campaign_raised', 'campaign_spent', 'campaign_cash' ];

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
    _.each(graphicData, function(d, i) {
        for (key in d) {
            if (_.contains(DATA_COLS, key)) {
                if (d[key] != null) {
                    d[key] = +d[key];
                }
            }
        };
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var labelWidth = 110;
    var labelMargin = 6;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth - (labelWidth + labelMargin);
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - (22 * (DATA_COLS.length - 1)) - (labelWidth + labelMargin)) / DATA_COLS.length);
    }

    // define colors
    var colorScale = d3.scale.ordinal()
        .domain(DATA_COLS)
        .range([ COLORS['teal4'], COLORS['red4'], '#787878' ]);

    var graphic = d3.select('#graphic');

    // clear out existing graphics
    graphic.html('');

    // Render the chart!
    _.each(DATA_COLS, function(d, i) {
        var showLabels = false;
        if (isMobile || i == 0) {
            showLabels = true;
        }

        var thisGraphicWidth = graphicWidth;
        if (showLabels) {
            thisGraphicWidth += labelWidth + labelMargin;
        }

        graphic.append('div')
            .attr('id', classify(d))
            .attr('class', 'graphic-container');

        renderBarChart({
            container: '#' + classify(d),
            width: thisGraphicWidth,
            data: graphicData,
            showLabels: showLabels,
            labelWidth: labelWidth,
            labelMargin: labelMargin,
            labelColumn: 'candidate',
            valueColumn: d,
            color: colorScale(d)
        });

    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = config['labelColumn'];
    var valueColumn = config['valueColumn'];

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = config['labelWidth'];
    var labelMargin = config['labelMargin'];
    var valueMinWidth = 65;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: 10
    };
    if (config['showLabels']) {
        margins['left'] = (labelWidth + labelMargin);
    }

    var ticksX = 4;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container'])
        .attr('style', 'width: ' + config['width'] + 'px;');

    /*
     * Create the root SVG element.
     */
    containerElement.append('h3')
        .attr('style', 'margin-left: ' + margins['left'] + 'px;')
        .text(function() {
            switch(config['valueColumn']) {
                case DATA_COLS[0]:
                    return HDR_RAISED;
                    break;
                case DATA_COLS[1]:
                    return HDR_SPENT;
                    break;
                case DATA_COLS[2]:
                    return HDR_CASH;
                    break;
                default:
                    return config['valueColumn'];
                    break;
            }
        });

//         config['valueColumn']);


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
        .domain([ 0, MAX_VALUE ])
        .range([ 0, chartWidth ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return '$' + (d.toFixed(0) / 1000000) + 'M';
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
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('width', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('height', barHeight)
            .style('fill', config['color'])
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
            });

    /*
     * Render bar labels.
     */
    if (config['showLabels']) {
        chartWrapper.append('ul')
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
                        return d[labelColumn] + ' (' + d['party'].slice(0,1) + ')';
                    });
    }

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                if (xScale(d[valueColumn]) > valueMinWidth) {
                    return -6;
                } else {
                    return 6;
                }
            })
            .attr('dy', (barHeight / 2) + 3)
            .attr('text-anchor', function(d) {
                if (xScale(d[valueColumn]) > valueMinWidth) {
                    return 'end';
                } else {
                    return 'begin';
                }
            })
            .attr('class', function(d) {
                var c = classify(d[labelColumn]);
                if (xScale(d[valueColumn]) > valueMinWidth) {
                    c += ' in';
                } else {
                    c += ' out';
                }
                return c;
            })
            .text(function(d) {
                var v = null;

                if (d[valueColumn] == null) {
                    v = 'n/a';
                } else {
                    var value = d[valueColumn].toFixed(0);

                    if (value >= 50000) {
                        var v = value / 1000000;

                        if ((d[valueColumn] / 1000000) > 0 && v == 0) {
                            v = '<1';
                        } else {
                            v = v.toFixed(1);
                        }

                        v = '$' + v + ' million';
                    } else {
                        v = '$' + fmtComma(value);
                    }
                }

                return v;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
