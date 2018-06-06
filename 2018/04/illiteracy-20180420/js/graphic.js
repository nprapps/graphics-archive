// Global vars
var PROMO_WIDTH = 450;
var pymChild = null;
var isMobile = false;
var isPromo = false;
var skipLabels = [ 'chart', 'label', 'values', 'offset' ];
var charts = [];

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

    DATA_MINORITY.forEach(function(d) {
        d['amt'] = +d['amt'];
    });

    charts = _.uniq(_.pluck(DATA, 'chart'));
    charts.push('minority');
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (d3.select('body').classed('promo')) {
        isPromo = true;
    }

    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (isPromo) {
        containerWidth = PROMO_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#diverging-bar-chart');
    containerElement.html('');

    _.each(charts, function(v,k) {
        var chartElement = containerElement.append('div')
            .attr('class', 'chart ' + classify(v));

        // Render the chart!
        if (v == 'minority') {
            renderBarChart({
                container: '.chart.' + classify(v),
                width: containerWidth,
                data: DATA_MINORITY,
                headline: LABELS['hed_' + v],
                id: k
            });
        } else {
            var chartData = DATA.filter(function(d,i) {
                return d['chart'] == v;
            });

            renderDivergingBarChart({
                container: '.chart.' + classify(v),
                width: containerWidth,
                data: chartData,
                headline: LABELS['hed_' + v],
                id: k,
                xDomain: [ -66, 34 ]
            });
        }
    })

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a diverging bar chart.
 */
var renderDivergingBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 30;
    var barGap = 5;

    if (config['id'] == 1 && !isPromo) {
        barHeight = 20;
        barGap = 2;
    }

    if (isPromo) {
        barHeight = 25;
        barGap = 2;
    }

    var labelWidth = 55;
    var labelMargin = 10;
    var valueGap = 6;

    var showFullLegend = true;
    var showBarLabels = false;
    if (config['data'][0]['values'].length == 2) {
        showFullLegend = false;
        showBarLabels = true;
    }
    if (config['data'][0]['values'].length < 2) {
        showFullLegend = false;
        showBarLabels = false;
    }

    var margins = {
        top: 0,
        right: 15,
        bottom: 0,
        left: (labelWidth + labelMargin)
    };

    if (!showFullLegend && showBarLabels) {
        margins['top'] = 20;
    }

    if (isMobile) {
        margins['right'] = 73;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length) - barGap;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h1')
        .html(config['headline']);

    /*
     * Create D3 scale objects.
     */
    var min = config['xDomain'][0];
    var max = config['xDomain'][1];

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ COLORS['teal2'], COLORS['teal4'], '#ccc', '#999' ]);

    /*
     * Render the legend.
     */
    if (showFullLegend) {
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

     group.selectAll('rect.bg')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', 0)
             .attr('width', chartWidth)
             .attr('height', barHeight)
             .style('fill', '#eee')
             .attr('class', function(d) {
                 return 'bg ' + classify(d['name']);
             });

     group.selectAll('rect.value-bar')
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
                 return 'value-bar ' + classify(d['name']);
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

                if (textWidth > barWidth) {
                    if (i == 0 || i == config['data'][0]['values'].length - 1) {
                        // first or last item -- set outside the bar
                        d3.select(this).classed('out', true);

                        if (d['x0'] < 0) {
                            return -valueGap;
                        } else {
                            return valueGap;
                        }
                    } else {
                        // middle bar -- hide
                        d3.select(this).classed('hidden', true);
                        return 0;
                    }
                } else if (textWidth < barWidth && (textWidth + valueGap * 2) > barWidth) {
                    // label baaaarely fits inside the bar. center it in the avail space
                    d3.select(this).classed('center', true);

                    var xShift = ((xScale(d['x1']) - xScale(d['x0'])) / 2);

                    if (d['x0'] < 0) {
                        return xShift;
                    } else {
                        return -xShift;
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

    // if there are only two categories, show labels above the bars instead
    if (showBarLabels) {
        var annotations = chartElement.append('g')
            .attr('class', 'annotations')
            .selectAll('text')
            .data(colorScale.domain())
            .enter().append('text')
                .text(function(d) {
                    return d;
                })
                .attr('class', function(d, i) {
                    return 'dhdr dhdr-' + i;
                })
                .attr('x', xScale(0))
                .attr('y', -10)
                .attr('dx', function(d, i) {
                    if (i == 0) {
                        return -valueGap;
                    } else {
                        return valueGap;
                    }
                })
                .attr('fill', function(d) {
                    return colorScale(d);
                });
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
}

/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var barHeight = 20;
    var barGap = 3;
    var labelWidth = 55;
    var labelMargin = 10;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    if (isMobile) {
        margins['right'] = 73;
    }

    if (isPromo) {
        labelWidth = 60;
        barHeight = 30;
        margins['left'] = labelWidth + labelMargin;
        margins['right'] = 0;
    }

    var ticksX = 4;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    var headline = containerElement.append('h1')
        .html(config['headline']);

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
    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    // var max = d3.max(config['data'], function(d) {
    //     return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    // })
    var max = 100;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    // bg bars
    chartElement.append('g')
        .attr('class', 'bg')
        .selectAll('rect.bg')
        .data(config['data'])
        .enter().append('rect')
            .attr('x', 0)
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('width', chartWidth)
            .attr('height', barHeight)
            .style('fill', '#eee')
            .attr('class', function(d) {
                return 'bg ' + classify(d[labelColumn]);
            });

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d.toFixed(0) + '%';
        });

    /*
     * Render axes to chart.
     */
    if (!isPromo) {
        chartElement.append('g')
            .attr('class', 'x axis')
            .attr('transform', makeTranslate(0, chartHeight))
            .call(xAxis);
    }

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
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
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
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d) {
                return d[valueColumn].toFixed(0) + '%';
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()

                // Negative case
                if (d[valueColumn] < 0) {
                    var outsideOffset = -(valueGap + textWidth);

                    if (xStart + outsideOffset < 0) {
                        d3.select(this).classed('in', true)
                        return valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return outsideOffset;
                    }
                // Positive case
                } else {
                    if (xStart + valueGap + textWidth > chartWidth) {
                        d3.select(this).classed('in', true)
                        return -(valueGap + textWidth);
                    } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    }
                }
            })
            .attr('dy', (barHeight / 2) + 3)
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
