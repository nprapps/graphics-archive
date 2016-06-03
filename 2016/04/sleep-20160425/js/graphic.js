// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['offset'] = +d['offset'];
        var x0 = d['offset'];

        d['values'] = [];

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'range' || key == 'offset') {
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
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderStackedBarChart({
        container: '#stacked-bar-chart',
        width: containerWidth,
        data: DATA
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
    var labelColumn = 'label';

    var barHeight = 35;
    var barGap = 5;
    var labelWidth = 70;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 40,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 24;
    var roundTicksFactor = 1;

    if (isMobile) {
        ticksX = 12;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
     var min = d3.min(config['data'], function(d) {
         var lastValue = d['values'][d['values'].length - 1];

         return Math.floor(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
     });

     if (min > 0) {
         min = 0;
     }

     var max = d3.max(config['data'], function(d) {
         var lastValue = d['values'][d['values'].length - 1];

         return Math.ceil(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
     });

     max = 24;

     var xScale = d3.scale.linear()
         .domain([min, max])
         .rangeRound([0, chartWidth]);

     var colorScale = d3.scale.ordinal()
         .domain(d3.keys(config['data'][0]).filter(function(d) {
             return d != labelColumn && d != 'values' && d != 'range' && d != 'offset';
         }))
         .range([ COLORS['blue5'], COLORS['blue3'], COLORS['blue5'] ]);

    /*
     * Render the legend.
     */
    // var legend = containerElement.append('ul')
	// 	.attr('class', 'key')
	// 	.selectAll('g')
	// 		.data(colorScale.domain())
	// 	.enter().append('li')
	// 		.attr('class', function(d, i) {
	// 			return 'key-item key-' + i + ' ' + classify(d);
	// 		});
    //
    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return colorScale(d);
    //     });
    //
    // legend.append('label')
    //     .text(function(d) {
    //         return d;
    //     });

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
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (i % 2 == 0) {
                if (i == ticksX) {
                    return d + ' hours';
                } else {
                    return d;
                }
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    d3.selectAll('.tick text')
        .attr('style', function(d,i) {
            if (d == 24) {
                return 'text-anchor: start;';
            } else {
                return 'text-anchor: middle;';
            }
        })
        .attr('dx', function(d,i) {
            if (d == 24) {
                return -6;
            } else {
                return 0;
            }
        });

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
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }

                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .style('fill', function(d) {
                 return colorScale(d['name']);
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

     /*
      * Render bar values.
      */
     group.append('text')
        .text(function(d) {
            var min = d['Inner'] + d['offset'];
            var max = d['Inner'] + d['Recommended'] + d['offset'];

            var txt = min + ' to ' + max + ' hours';
            if (isMobile) {
                txt = min + '-' + max;
            }

            return txt;
        })
        .attr('class', function(d) {
            return 'value ' + classify(d[labelColumn]);
        })
        .attr('x', function(d) {
            var min = d['Inner'] + d['offset'];
            var max = d['Inner'] + d['Recommended'] + d['offset'];
            var avg = (min + max) / 2;

				return xScale(avg);
        })
        .attr('dy', (barHeight / 2) + 4);

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

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
                .html(function(d) {
                    return '<b>' + d[labelColumn] + '</b>' + ' <i>' + d['range'] + '</i>';
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
