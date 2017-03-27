// Global vars
var pymChild = null;
var isMobile = false;
var annotations = [];

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
        d['amt'] = +d['amt'];

        if (d['annotate'] == 'yes') {
            annotations.push(d);
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
    if (isMobile) {
        renderBarChart({
            container: '#column-chart',
            width: containerWidth,
            data: DATA
        });
    } else {
        renderColumnChart({
            container: '#column-chart',
            width: containerWidth,
            data: DATA
        });
    }

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

    config['data'] = config['data'].sort(function(a, b) {
        return d3.descending(a['amt'], b['amt']);
    });

    var labelColumn = 'state_postal';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 5;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 5,
        bottom: 30,
        left: 35
    };

    var ticksY = 4;
    var roundTicksFactor = 10;

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

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));
    if (isMobile) {
        // allow for fuzzier bars on mobile
        xScale.rangeBands([0, chartWidth], .1);
    } else {
        // require clean bar widths on desktop
        xScale.rangeBands([0, chartWidth], .1);
        // xScale.rangeRoundBands([0, chartWidth], .1);
    }

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return (Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor) - 5;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d) + '%';
        });

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

    // shift axis labels
    // if (!isMobile) {
    chartElement.selectAll('.x.axis .tick line')
        .attr('y2', function(d,i) {
            if (i%2 == 1) {
                return 15;
            } else {
                return 5;
            }
        });
    chartElement.selectAll('.x.axis .tick text')
        .attr('dy', function(d,i) {
            if (i%2 == 1) {
                return 18;
            } else {
                return 6;
            }
        });
    // }

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
            .attr('class', function(d, i) {
                var c = 'bar-' + i + ' ' + classify(d[labelColumn]);
                if (d['annotate'] == 'yes') {
                    c += ' annotated';
                }
                return c;
            });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    var annotationItems = chartElement.append('g')
        .attr('class', 'annotations');
    annotationItems.selectAll('text')
        .data(annotations)
        .enter()
            .append('text')
            .text(function(d) {
                return d['label'] + ': ' + d['amt'].toFixed(1) + '%';
            })
            .attr('x', function(d) {
                return xScale(d['state_postal']);
            })
            .attr('y', function(d) {
                return yScale(d['amt']);
            })
            .attr('dx', 0)
            .attr('dy', function(d,i) {
                if (i % 2 == 0) {
                    return -20;
                } else {
                    return -15;
                }
            });
    annotationItems.selectAll('line')
        .data(annotations)
        .enter()
            .append('line')
            .attr('x1', function(d) {
                return xScale(d['state_postal']) + (xScale.rangeBand() / 2);
            })
            .attr('x2', function(d) {
                return xScale(d['state_postal']) + (xScale.rangeBand() / 2);
            })
            .attr('y1', function(d) {
                return yScale(d['amt']);
            })
            .attr('y2', function(d,i) {
                var offset = 10;
                if (i % 2 == 0) {
                    offset = 15;
                }
                return yScale(d['amt']) - offset;
            });

    // us average
    annotationItems.append('line')
        .attr('class', 'us-average')
        .attr('x1', 0)
        .attr('x2', chartWidth + margins['right'])
        .attr('y1', yScale(6.9))
        .attr('y2', yScale(6.9));

    annotationItems.append('text')
        .attr('class', 'us-average')
        .attr('x', chartWidth + margins['right'])
        .attr('y', yScale(6.9))
        .attr('dy', -6)
        .text('U.S. average: 6.9%');
}


/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    config['data'] = config['data'].sort(function(a, b) {
        return d3.ascending(a['amt'], b['amt']);
    });

    var labelColumn = 'state_ap';
    var valueColumn = 'amt';

    var barHeight = 15;
    var barGap = 2;
    var labelWidth = 45;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 10;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

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

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    })

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

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
                var c = 'bar-' + i + ' ' + classify(d[labelColumn]);
                if (d['annotate'] == 'yes') {
                    c += ' annotated';
                }
                return c;
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
                var c = classify(d[labelColumn]);
                if (d['annotate'] == 'yes') {
                    c += ' annotated';
                }
                return c;
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
                });

    var annotationItems = chartElement.append('g')
        .attr('class', 'annotations');
    // us average
    annotationItems.append('line')
        .attr('class', 'us-average')
        .attr('x1', xScale(6.9))
        .attr('x2', xScale(6.9))
        .attr('y1', -margins['top'])
        .attr('y2', chartHeight);

    annotationItems.append('text')
        .attr('class', 'us-average')
        .attr('x', xScale(6.9))
        .attr('y', 0)
        .attr('dx', 6)
        .attr('dy', 10)
        .html('&lsaquo;&nbsp;U.S. average: 6.9%');

    /*
     * Render bar values.
     */
    _.each([ 'value shadow', 'value'], function(cls) {
        chartElement.append('g')
            .attr('class', cls)
            .selectAll('text')
            .data(config['data'])
            .enter()
            .append('text')
                .text(function(d) {
                    return d[valueColumn].toFixed(1) + '%';
                })
                .attr('class', function(d) {
                    var c = classify(d[labelColumn]);
                    if (d['annotate'] == 'yes') {
                        c += ' annotated';
                    }
                    return c;
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
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
