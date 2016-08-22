// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values', 'median_income', 'population', 'share_lower', 'share_middle', 'share_upper' ];

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
        var x0 = 0;

        d['share_lower'] = +d['share_lower'];
        d['share_middle'] = +d['share_middle'];
        d['share_upper'] = +d['share_upper'];
        d['median_income'] = +d['median_income'];

        d['values'] = [];

        for (var key in d) {
            if (_.contains(skipLabels, key)) {
                continue;
            }

            d[key] = +d[key];

            var popShare = null;
            switch(key) {
                case 'Lower income':
                    popShare = d['share_lower'];
                    break;
                case 'Middle income':
                    popShare = d['share_middle'];
                    break;
                case 'Upper income':
                    popShare = d['share_upper'];
                    break;
            }

            // var x1 = x0 + d[key];
            var x1 = d[key];

            d['values'].push({
                'name': key,
                'x0': x0,
                'x1': x1,
                'val': d[key],
                'popShare': popShare / 100
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

    var barHeight = 70;
    var barGap = isMobile ? 25 : 15;
    var labelWidth = isMobile ? 110 : 120;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 60,
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
    var chartHeight = ((barHeight + barGap) * config['data'].length) - barGap;

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

    min = 0;
    max = 200000;

     var xScale = d3.scale.linear()
         .domain([min, max])
         .rangeRound([0, chartWidth]);

     var colorScale = d3.scale.ordinal()
         .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
         }))
         .range([ '#787878', COLORS['blue3'], '#ccc' ]);

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
        .ticks(ticksX)
        .tickFormat(function(d) {
            var val = '$' + fmtComma(d);
            if (d == 200000) {
                return val + '+';
            } else {
                return val;
            }
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
             .attr('y', function(d) {
                 var rectHeight = Math.ceil(barHeight * d['popShare']);
                 return barHeight - rectHeight;
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', function(d) {
                return Math.ceil(barHeight * d['popShare']);
             })
             .style('fill', function(d) {
                 return colorScale(d['name']);
             })
             .style('stroke', function(d) {
                 return colorScale(d['name']);
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

    group.append('line')
        .attr('x1', function(d) {
            return xScale(d['median_income']);
        })
        .attr('x2', function(d) {
            return xScale(d['median_income']);
        })
        .attr('y1', function(d) {
            var rectHeight = Math.ceil(barHeight * d['values'][1]['popShare']);
            return barHeight;
        })
        .attr('y2', function(d) {
            var rectHeight = Math.ceil(barHeight * d['values'][1]['popShare']);
            var textOffset = isMobile ? 16 : 12;
            return barHeight - rectHeight - textOffset;
        })
        .attr('class', 'median-line');

    group.append('text')
        .text(function(d,i) {
            if (i === 0) {
                return 'Median income: $' + fmtComma(d['median_income']);
            } else if (isMobile) {
                return '$' + fmtComma(d['median_income']);
            } else {
                return 'Median: $' + fmtComma(d['median_income']);
            }

        })
        .attr('x', function(d) {
            return xScale(d['median_income']);
        })
        .attr('y', function(d) {
            var rectHeight = Math.ceil(barHeight * d['values'][1]['popShare']);
            var textOffset = isMobile ? 20 : 16;
            return barHeight - rectHeight - textOffset;
        })
        .attr('class', 'median-label');

    group.append('g')
        .attr('class', 'values')
        .selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('text')
            .text(function(d) {
                if (isMobile) {
                    return (d['popShare'] * 100).toFixed(0) + '%';
                } else {
                    return (d['popShare'] * 100).toFixed(1) + '%';
                }
            })
            .attr('x', function(d) {
                return xScale(d['x0'] + ((d['x1'] - d['x0']) / 2));
            })
            .attr('y', function(d) {
                var rectHeight = Math.ceil(barHeight * d['popShare']);
                return barHeight - rectHeight - 4;
            });

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
    var labels = chartWrapper.append('ul')
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
            .append('span');
    labels.append('b')
        .text(function(d) {
            return d[labelColumn];
        });
    labels.append('i')
        .text(function(d) {
            return 'Population: ' + fmtComma(d['population']);
        });

    /*
     * Add key for share
     */
    // Add arrowhead
    chartElement.append('defs').append('marker')
        .attr('id', 'arrowhead-up')
        .attr('refX', 3)
        .attr('refY', 2)
        .attr('markerWidth', 4)
        .attr('markerHeight', 4)
        .attr('orient', -90)
        .append('path')
            .attr('d', 'M 0,0 V 4 L4,2 Z');

    chartElement.append('defs').append('marker')
        .attr('id', 'arrowhead-down')
        .attr('refX', 3)
        .attr('refY', 2)
        .attr('markerWidth', 4)
        .attr('markerHeight', 4)
        .attr('orient', 90)
        .append('path')
            .attr('d', 'M 0,0 V 4 L4,2 Z');

    var shareKey = chartElement.append('g')
        .attr('class', 'share-key')
        .attr('transform', 'translate(' + chartWidth + ',0)');

    var firstData = config['data'][0];
    var firstRectHeight = barHeight * firstData['values'][2]['popShare'];
    shareKey.append('line')
        .attr('marker-start', 'url(#arrowhead-up)')
        .attr('marker-end', 'url(#arrowhead-down)')
        .attr('x1', 10)
        .attr('x2', 10)
        .attr('y1', barHeight - firstRectHeight +1)
        .attr('y2', barHeight -1);

    shareKey.append('text')
        .text('Share in group')
        .attr('x', 18)
        .attr('y', barHeight - firstRectHeight + 11)
        .call(wrapText, margins['right'] - 18, 11);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
