// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values', 'offset', 'grouping' ];
var groupings = null;

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
    DATA.forEach(function(d) {
        d['values'] = [];
        d['offset'] = +d['offset'];
        var x0 = d['offset'];

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

    groupings = _.pluck(DATA, 'grouping');
    groupings = d3.set(groupings).values();
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

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#stacked-bar-chart');
    containerElement.html('');

    _.each(groupings, function(d, i) {
        var chartData = DATA.filter(function(v, k) {
            return v['grouping'] == d;
        });

        containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        // Render the chart!
        renderStackedBarChart({
            container: '.chart.' + classify(d),
            width: containerWidth,
            data: chartData,
            title: d
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
    var barGap = 5;
    var labelWidth = 56;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 8;

    if (isMobile) {
        ticksX = 6;
        valueGap = 4;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length) - barGap;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var min = -84;
    var max = 49;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ COLORS['teal3'], COLORS['teal5'], '#ccc', '#999' ]);

    /*
     * Render the legend.
     */
    if (config['title'] == 'Overall') {
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
    }

    containerElement.append('h3')
        .text(config['title']);

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
            return Math.abs(d) + '%';
        });

    /*
     * Render axes to chart.
     */
    // chartElement.append('g')
    //     .attr('class', 'x axis')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    // chartElement.append('g')
    //     .attr('class', 'x grid')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxisGrid()
    //         .tickSize(-chartHeight, 0, 0)
    //         .tickFormat('')
    //     );

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
     group.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('text')
            .text(function(d) {
                if (d['val'] != 0) {
                    return d['val'] + '%';
                }
            })
            .attr('class', function(d) {
                var c = classify(d['name']);
                if (d['x0'] < 0) {
                    c += ' left';
                } else {
                    c += ' right';
                }
                return c;
            })
            .attr('x', function(d) {
                if (d['x0'] < 0) {
                    return xScale(d['x0']);
                } else {
                    return xScale(d['x1']);
                }
            })
            .attr('dx', function(d, i) {
                var textWidth = this.getComputedTextLength();
                var barWidth = Math.abs(xScale(d['x1']) - xScale(d['x0']));

                // if (textWidth + valueGap * 2 > barWidth) {
                if ((textWidth + valueGap) > barWidth && (i == 0 || i == 3)) {
                    // too small to fit in the bar -- set outside instead
                    d3.select(this).classed('out', true);

                    if (d['x0'] < 0) {
                        return -valueGap;
                    } else {
                        return valueGap;
                    }
                } else {
                    if (d['x0'] < 0) {
                        return valueGap;
                    } else {
                        return -valueGap;
                    }
                }

            })
            .attr('dy', (barHeight / 2) + 4)

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
                    return d[labelColumn];
                });

    // // labels
    // var annotations = chartElement.append('g')
    //     .attr('class', 'annotations')
    //     .selectAll('text')
    //     .data([ colorScale.domain()[0], colorScale.domain()[3] ])
    //     .enter().append('text')
    //         .html(function(d, i) {
    //             switch(i) {
    //                 case 0:
    //                     return 'Agree';
    //                     break;
    //                 case 1:
    //                     return 'Disagree';
    //                     break;
    //             }
    //             // return d;
    //         })
    //         .attr('class', function(d, i) {
    //             return 'label label-' + i + ' ' + classify(d);
    //         })
    //         .attr('x', xScale(0))
    //         .attr('y', -15)
    //         .attr('dx', function(d, i) {
    //             if (i == 0) {
    //                 return -valueGap;
    //             } else {
    //                 return valueGap;
    //             }
    //         })
    //         .attr('fill', function(d) {
    //             return colorScale(d);
    //         });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
