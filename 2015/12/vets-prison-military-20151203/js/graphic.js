// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var categories = [ 'combat', 'era' ];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
       loadLocalData(DATA);
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    categories.forEach(function(d, i) {
        formatData(DATA[d]['data']);
    });

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
var formatData = function(data) {
    data.forEach(function(d) {
        d['values'] = [];

        for (var key in d) {
            var x0 = null;
            var x1 = null;

            if (key == 'label' || key == 'values') {
                continue;
            }

            d[key] = +d[key];

            switch(key) {
                case 'Prison Inmates':
                    x0 = 0 - d[key];
                    x1 = 0;
                    break;
                case 'Jail Inmates':
                    x0 = 0;
                    x1 = d[key];
                    break;
            }

            d['values'].push({
                'name': key,
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })
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

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    // Clear existing graphic (for redraw)
    var containerElement = d3.select('.graphic');
    containerElement.html('');

    for (c in categories) {
        var category = categories[c];

        containerElement.append('div')
            .attr('class', 'butterfly ' + classify(category));

        renderStackedBarChart({
            container: '.' + classify(category),
            width: containerWidth,
            data: DATA[category]['data'],
            title: DATA[category]['title']
        });
    }

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
    var labelColumn = 'label';

    var barHeight = 35;
    var barGap = 5;
    var labelWidth = 100;
    var labelMargin = 6;
    var valueMinWidth = 30;

    var margins = {
        top: 20,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = [ -100, -50, 0, 50, 100 ];
    var roundTicksFactor = 100;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);

    // header
    containerElement.append('h3')
        .text(config['title'])
        .attr('style', function() {
            var s = '';
            s += 'margin-left: ' + margins['left'] + 'px;';
            s += 'margin-right: ' + margins['right'] + 'px;';
            return s;
        });

    /*
     * Create D3 scale objects.
     */
     var xScale = d3.scale.linear()
         .domain([ -100, 100 ])
         .rangeRound([0, chartWidth]);

     var colorScale = d3.scale.ordinal()
         .domain([ 'Prison Inmates', 'Jail Inmates'])
         .range([ COLORS['orange3'], COLORS['orange5'] ]);

    /*
     * Render the legend.
     */
//     var legend = containerElement.append('ul')
// 		.attr('class', 'key')
// 		.selectAll('g')
// 			.data(colorScale.domain())
// 		.enter().append('li')
// 			.attr('class', function(d, i) {
// 				return 'key-item key-' + i + ' ' + classify(d);
// 			});
//
//     legend.append('b')
//         .style('background-color', function(d) {
//             return colorScale(d);
//         });
//
//     legend.append('label')
//         .text(function(d) {
//             return d;
//         });

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
        .tickValues(ticksX)
        .tickFormat(function(d) {
            return Math.abs(d) + '%';
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
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 // console.log(d);
                 return 'group ' + classify(d[labelColumn]);
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
                switch(i) {
                    case 0:
         				return xScale(d['x0']);
                        break;
                    case 1:
         				return xScale(d['x1']);
                        break;
                }
             })
             .attr('dx', function(d, i) {
                switch(i) {
                    case 0:
                        return -6;
                        break;
                    case 1:
                        return 6;
                        break;
                }
             })
             .attr('dy', (barHeight / 2) + 4)
             .attr('text-anchor', function(d, i) {
                switch(i) {
                    case 0:
                        return 'end';
                        break;
                    case 1:
                        return 'begin';
                        break;
                }
             })
             .attr('class', function(d) {
                return classify(d['name']) + ' out';
             })
             .text(function(d) {
                 if (d['val'] > 0 && d['val'] < 1) {
                     return '< 1%';
                 }
                 if (d['val'] >= 1) {
                     return d['val'].toFixed(0) + '%';
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
                return classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
                });


    /*
     * bar labels
     */
    var legend = chartElement.append('g')
        .attr('class', 'bar-labels')
        .selectAll('text')
            .data(colorScale.domain())
        .enter().append('text')
            .attr('x', xScale(0))
            .attr('y', 0)
            .attr('dx', function(d,i) {
                switch(i) {
                    case 0:
                        return -9;
                        break;
                    case 1:
                        return 9;
                        break;
                }
            })
            .attr('dy', -9)
            .attr('text-anchor', function(d,i) {
                switch(i) {
                    case 0:
                        return 'end';
                        break;
                    case 1:
                        return 'begin';
                        break;
                }
            })
            .html(function(d,i) {
                switch(i) {
                    case 0:
                        return '&lsaquo; ' + d;
                        break;
                    case 1:
                        return d + ' &rsaquo;';
                        break;
                }
            });

    /*
     * 0-axis line
     */
    var axis0 = chartElement.append('line')
        .attr('class', 'axis x zero')
        .attr('x1', xScale(0))
        .attr('y1', -margins['top'])
        .attr('x2', xScale(0))
        .attr('y2', chartHeight);

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
