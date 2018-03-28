// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values' ];
var dataKeys = ['defense', 'nondefense'];

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
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    dataKeys.forEach(function(keyName) {
        DATA[keyName].forEach(function(d) {
            var x0 = 0;

            d['values'] = [];

            for (var key in d) {
                if (_.contains(skipLabels, key)) {
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

    var containerElement = d3.select('#stacked-bar-chart');
    containerElement.html('');

    dataKeys.forEach(function(keyName, i) {
        var chartId = 'chart-' + keyName;
        containerElement.append('div')
            .attr('class', 'graphic')
            .attr('id', chartId);

        // Render the chart!
        renderStackedBarChart({
            chartIndex: i,
            container: '#' + chartId,
            width: isMobile ? containerWidth : 0.48 * containerWidth,
            data: DATA[keyName],
            overallMax: 1000,
            chartLabel: LABELS['label_' + keyName]
        });
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

    var barHeight = 30;
    var barGap = 10;
    var labelWidth = config['width'] < 290 ? 28 : 42;
    var labelMargin = 4;
    var valueGap = 4;

    var margins = {
        top: 0,
        right: config['width'] < 290 ? 45 : 30,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksX = 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['chartLabel']);

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

    max = config['overallMax'];

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ '#5e88a1', COLORS['orange3'], COLORS['blue3'], '#ccc' ]);

    /*
     * Render the legend.
     */

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
        .tickFormat(function(d) {
            return d;
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

    // Add baseline spending
    group.append('g')
        .attr('class', 'value')
        .append('text')
            .attr('class', 'value-baseline')
            .attr('x', 0)
            .attr('dx', valueGap)
            .attr('dy', (barHeight / 2) + 4)
            .text(function(d) {
                return '$' + d['Base spending'] + ' billion baseline';
            })

    // Add additional spending
    group.append('g')
        .attr('class', 'value')
        .append('text')
            .attr('class', 'value-addition')
            .attr('x', function(d) {
                var totalSpending = d['Additional spending'] + d['Base spending'];
                return xScale(totalSpending);
            })
            .attr('dx', valueGap)
            .attr('dy', (barHeight / 2) - 4)
            .text(function(d) {
                if (d['Additional spending'] > 0) {
                    return '$' + d['Additional spending'] + ' billion added';
                }
            })

    // Add total spending
    group.append('g')
        .attr('class', 'value')
        .append('text')
            .attr('class', 'value-total')
            .attr('x', function(d) {
                var totalSpending = d['Additional spending'] + d['Base spending'];
                return xScale(totalSpending);
            })
            .attr('dx', valueGap)
            .attr('dy', function(d) {
                if (d['Additional spending'] > 0) {
                    return (barHeight / 2) + 10;
                } else {
                    return (barHeight / 2) + 4;
                }
            })
            .text(function(d) {
                if (d['Additional spending'] > 0) {
                    var totalSpending = d['Additional spending'] + d['Base spending'];
                    return '$' + totalSpending + ' billion total';
                }
            })

     /*
      * Render bar values.
     group.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) {
            console.log(d);
            return d['values'];
        })
        .enter().append('text')
            .text(function(d) {
                if (d['val'] != 0) {
                    return d['val'];
                }
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d) {
 				return xScale(d['x1']);
            })
            .attr('dx', function(d) {
                var textWidth = this.getComputedTextLength();
                var barWidth = Math.abs(xScale(d['x1']) - xScale(d['x0']));

                // Hide labels that don't fit
                if (textWidth + valueGap * 2 > barWidth) {
                    d3.select(this).classed('hidden', true)
                }

                if (d['x1'] < 0) {
                    return valueGap;
                }

                return -(valueGap + textWidth);
            })
            .attr('dy', (barHeight / 2) + 4)
      */

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
                .text(function(d) {
                    if (config['width'] < 290) {
                        var labelPieces = d[labelColumn].split('20')
                        return labelPieces.join('');
                    }
                    return d[labelColumn];
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
