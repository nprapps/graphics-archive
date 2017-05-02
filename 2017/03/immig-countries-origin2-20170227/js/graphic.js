// Global vars
var MMEDIA_THRESHOLD = 730;
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values', 'total', 'offset' ];

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
 * Format data for D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['amt'] = +d['amt'];
    });

    CHANGE.forEach(function(d) {
        d['amt'] = +d['amt'];
    });

    BORDER.forEach(function(d) {
        var x0 = +d['offset'];

        d['values'] = [];
        d['total'] = 0;

        for (var key in d) {
            if (_.contains(skipLabels, key)) {
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];
            d['total'] += d[key];

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

    var originGraphicWidth = containerWidth;
    var declineGraphicWidth = null;
    var gutterWidth = 33;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        declineGraphicWidth = containerWidth;
    } else {
        isMobile = false;
        declineGraphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }
    if (containerWidth >= MMEDIA_THRESHOLD) {
        originGraphicWidth = 650;
    }

    // Clear existing graphic (for redraw)
    d3.selectAll('.graphic').html('')

    // Render the chart!
    renderBarChart({
        container: '#bar-chart',
        width: originGraphicWidth,
        data: DATA,
        domain: [ 0, 6000000 ],
        showAxes: true,
        id: 'origin'
    });

    var declines = d3.select('#declines');

    var changeChart = declines.append('div')
        .attr('class', 'change chart');
    changeChart.append('h4')
        .html(LABELS['subhed_change']);
    renderBarChart({
        container: '#declines .chart.change',
        width: declineGraphicWidth,
        data: CHANGE,
        domain: [ -500000, 130000 ],
        showAxes: false,
        id: 'change'
    });

    var borderChart = declines.append('div')
        .attr('class', 'border chart');
    borderChart.append('h4')
        .html(LABELS['subhed_border']);
    renderButterflyBarChart({
        container: '#declines .chart.border',
        width: declineGraphicWidth,
        data: BORDER,
        showAxes: false,
        id: 'border'
    });

    if (!isMobile) {
        var charts = [ '.chart.change', '.chart.border' ];
        _.each(charts, function(d,i) {
            d3.select(d)
                .attr('style', function() {
                    var s = '';
                    s += 'width: ' + declineGraphicWidth + 'px; '
                    s += 'float: left; ';
                    if (i == 1) {
                        s += 'margin-left: ' + Math.floor(gutterWidth / 2) + 'px; ';
                        s += 'padding-left: ' + (Math.floor(gutterWidth / 2) - 1) + 'px; ';
                        s += 'border-left: 1px solid #eee; ';
                    }
                    return s;
                });
        });
    }


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
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 115;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 20,
        bottom: 0,
        left: (labelWidth + labelMargin)
    };

    if (config['id'] == 'change') {
        margins['right'] = 50;
    }

    if (config['showAxes']) {
        margins['bottom'] = 20;
    }

    var ticksX = 4;
    var roundTicksFactor = 1000000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

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
    var min = config['domain'][0];
    var max = config['domain'][1];

    var xScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ 0, chartWidth ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            } else {
                if (isMobile) {
                    return d/1000000 + 'M';
                } else {
                    return d/1000000 + ' million';
                }
            }
        });

    /*
     * Render axes to chart.
     */
    if (config['showAxes']) {
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
    // if (min < 0) {
    //     chartElement.append('line')
    //         .attr('class', 'zero-line')
    //         .attr('x1', xScale(0))
    //         .attr('x2', xScale(0))
    //         .attr('y1', 0)
    //         .attr('y2', chartHeight);
    // }

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
                var val = fmtComma(d[valueColumn]);
                if (config['container'] == '#declines .chart.change' && d[valueColumn] > 0) {
                    val = '+' + val;
                }
                if (d['amt_verbose']) {
                    val = d['amt_verbose'];
                }
                return val;
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength();
                var barWidth = Math.abs(xScale(d[valueColumn]) - xScale(0));

                if (d['amt_verbose']) {
                    d3.select(this).classed('out', true);
                    return 0;
                }

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
                    if (valueGap + textWidth < barWidth) {
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
 * Render a butterfly bar chart.
 */
var renderButterflyBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 50;
    var labelMargin = 10;
    var valueGap = 6;

    var margins = {
        top: 30,
        right: 20,
        bottom: 0,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 8;

    if (isMobile) {
        ticksX = 6;
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
    var min = -503000;
    var max = 260000;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ COLORS['teal2'], COLORS['teal5'] ]);
        // .range([ '#498dcb', '#f05b4e' ]);

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
                    return fmtComma(d['val']);
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
            .attr('dx', function(d) {
                var textWidth = this.getComputedTextLength();
                var barWidth = Math.abs(xScale(d['x1']) - xScale(d['x0']));

                var isOut = false;
                if ((textWidth + (valueGap * 2)) > barWidth) {
                    isOut = true;
                }

                if (isOut) {
                    d3.select(this).classed('out', true);

                    if (d['x0'] < 0) {
                        return -valueGap - textWidth;
                    } else {
                        return valueGap + textWidth;
                    }
                } else {
                    d3.select(this).classed('in', true);
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
    // if (min < 0) {
    //     chartElement.append('line')
    //         .attr('class', 'zero-line')
    //         .attr('x1', xScale(0))
    //         .attr('x2', xScale(0))
    //         .attr('y1', 0)
    //         .attr('y2', chartHeight);
    // }

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

    // labels
    var annotations = chartElement.append('g')
        .attr('class', 'annotations')
        .selectAll('text')
        .data(colorScale.domain())
        .enter().append('text')
            .html(function(d) {
                return d;
            })
            .attr('class', function(d, i) {
                return 'label label-' + i + ' ' + classify(d);
            })
            .attr('x', xScale(0))
            .attr('y', -15)
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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
