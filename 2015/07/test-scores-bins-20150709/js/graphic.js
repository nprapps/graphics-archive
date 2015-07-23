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
//         for (var key in d) {
//             if (key != 'label') {
//                 d[key] = +d[key];
//             }
//         }

        var x0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (key == 'grade' || key == 'test' || key == 'values') {
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];

            d['values'].push({
                'name': key,
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })

            x0 = x1;
        }
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
    var gutterWidth = 22;
    var numCols = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    // Render the chart!
    renderStackedBarChart({
        container: '#graphic',
        width: graphicWidth,
        data: graphicData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var gradeColumn = 'grade';
    var testColumn = 'test';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 110;
    var labelMargin = 6;
    var valueMinWidth = 30;

    var ticksX = 4;
    var roundTicksFactor = 10;

    if (isMobile) {
        ticksX = 2;
        labelWidth = 55;
        barHeight = 40;
    }

    var margins = {
        top: 0,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);

    /*
     * Create D3 scale objects.
     */
     var xScale = d3.scale.linear()
         .domain([0, 51])
         .rangeRound([0, chartWidth]);

     var colorScale = d3.scale.ordinal()
         .domain(d3.keys(config['data'][0]).filter(function(d) {
             return d != gradeColumn && d != testColumn && d != 'values';
         }))
         .range([ COLORS['red4'], '#ddd', COLORS['yellow4'] ]);

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorScale.domain())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
        });

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
        .ticks(ticksX);

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
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d[testColumn]) + '-' + classify(d[gradeColumn]);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('height', barHeight)
             .attr('x', function(d) {
                 return xScale(d['x0']);
             })
             .attr('width', function(d) {
                 return xScale(d['x1']) - xScale(d['x0']);
             })
             .style('fill', function(d) {
                 return colorScale(d['name']);
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

     /*
      * Render bar values.
      */
     group.append('g')
         .attr('class', 'value')
         .selectAll('text')
             .data(function(d) {
                 return d['values'];
             })
         .enter().append('text')
             .attr('x', function(d, i) {
                if (d['val'] > 3) {
     				return xScale(d['x0']) + Math.floor((xScale(d['x1']) - xScale(d['x0'])) / 2);
                } else {
     				return xScale(d['x1']) + 3;
                }
             })
             .attr('dy', (barHeight / 2) + 4)
             .attr('text-anchor', function(d) {
                if (d['val'] > 3) {
                    return 'center';
                } else {
                    return 'start';
                }
             })
             .attr('class', function(d) {
                var c = classify(d['name']);
                if (d['val'] > 3) {
                    c += ' in';
                } else {
                    c += ' out';
                }
                return c;
             })
             .text(function(d) {
                 if (d['val'] > 0) {
                     var v = d['val'];
                     return v;
                 }
             });

    /*
     * Render bar labels.
     */
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
                return classify(d[testColumn]) + '-' + classify(d[gradeColumn]);
            })
            .append('span')
                .html(function(d) {
                    var t = d[testColumn];
                    if (isMobile) {
                        t += '<i>' + d[gradeColumn] + '</i>';
                    } else {
                        t += ' (' + d[gradeColumn] + ')';
                    }
                    return t;
                });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
