// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values', 'total', 'chart', 'year', 'category' ];
var colorDomain = [];
var colorRange = [ '#787878', COLORS['blue3'], '#ccc' ];
var chartTypes = [];

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
        var y0 = 0;

        d['values'] = [];
        d['total'] = 0;

        for (var key in d) {
            if (_.contains(skipLabels, key)) {
                continue;
            }

            d[key] = +d[key];

            var y1 = y0 + d[key];
            d['total'] += d[key];

            d['values'].push({
                'name': key,
                'y0': y0,
                'y1': y1,
                'val': d[key]
            })

            y0 = y1;
        }
    });

    chartTypes = _.pluck(DATA, 'chart');
    chartTypes = d3.set(chartTypes).values();

    colorDomain = d3.keys(DATA[0]).filter(function(d) {
        if (!_.contains(skipLabels, d)) {
            return d;
        }
    })
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = containerWidth;
    var gutterWidth = 22;
    var aspectRatio = {
        'width': 16,
        'height': 7
    };

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // identify container element
    // and delete existing contents
    var containerElement = d3.select('#stacked-column-chart');
    containerElement.html('');

    // create a new chart for each chart type in the spreadsheet
    chartTypes.forEach(function(d, i) {
        // filter the data for just this chart
        var chartData = DATA.filter(function(v,k) {
            return v['chart'] == d;
        });

        // create a container div
        var chartContainer = containerElement.append('div')
            .attr('class', classify(d) + ' chart');

        if (d == 'overall') {
            chartContainer.classed('wide', true);
        }

        // special styles for half-width graphics on desktop
        if (!isMobile && d != 'overall') {
            chartContainer.attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (i % 2 != 1) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        // subheds for the smaller charts
        if (d == 'overall') {
            chartContainer.append('h3')
                .text(HEADERS[d]);
        } else {
            chartContainer.append('h3')
                .text('by ' + d);
            chartContainer.append('h2')
                .html(HEADERS[d]);
        }

        // regular stacked column chart for "overall"
        if (d == 'overall') {
            renderStackedColumnChart({
                container: '.chart.' + classify(d),
                width: containerWidth,
                data: chartData,
                colorDomain: colorDomain,
                colorRange: colorRange,
                aspectRatio: aspectRatio
            });
        // fancy grouped stacked column chart for all others
        } else {
            renderGroupedStackedColumnChart({
                container: '.chart.' + classify(d),
                width: graphicWidth,
                data: chartData,
                colorDomain: colorDomain,
                colorRange: colorRange,
                aspectRatio: aspectRatio
            });
        }
    })

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a grouped stacked column chart.
 */
var renderGroupedStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var aspectWidth = config['aspectRatio']['width'];
    var aspectHeight = config['aspectRatio']['height'];
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 1,
        bottom: 65,
        left: 1
    };

    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'category'))
        .rangeRoundBands([0, chartWidth], .1)

    var xScaleBars = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .rangeRoundBands([0, xScale.rangeBand()], .1)

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(config['colorDomain'])
        .range(config['colorRange']);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d) {
            return d;
        });

    /*
     * Render axes to chart.
     */
    var xAxis = d3.svg.axis()
         .scale(xScale)
         .orient('bottom')
         .tickFormat(function(d) {
             return d;
         });
    chartElement.append('g')
         .attr('class', 'x axis category')
         .attr('transform', makeTranslate(0, chartHeight))
         .call(xAxis);

    chartElement.selectAll('.x.axis.category .tick line').remove();
    chartElement.selectAll('.x.axis.category text')
        .attr('y', 35)
        .attr('dy', 0)
        .call(wrapText, xScale.rangeBand(), 13);

    /*
     * Render bars to chart.
     */
    xScale.domain().forEach(function(c, k) {
        var categoryElement = chartElement.append('g')
            .attr('class', classify(c));

        var columns = categoryElement.selectAll('.columns')
            .data(config['data'].filter(function(d,i) {
                return d['category'] == c;
            }))
            .enter().append('g')
                .attr('class', 'column')
                .attr('transform', function(d) {
                    return makeTranslate(xScale(d['category']), 0);
                });

        // axis labels
        var xAxisBars = d3.svg.axis()
            .scale(xScaleBars)
            .orient('bottom')
            .tickFormat(function(d) {
                return d;
            });
        columns.append('g')
            .attr('class', 'x axis bars')
            .attr('transform', makeTranslate(0, chartHeight))
            .call(xAxisBars);

        // column segments
        var bars = columns.append('g')
            .attr('class', 'bar')
            .attr('transform', function(d) {
                return makeTranslate(xScaleBars(d[labelColumn]), 0);
            });

        bars.selectAll('rect')
            .data(function(d) {
                return d['values'];
            })
            .enter().append('rect')
                .attr('y', function(d) {
                    if (d['y1'] < d['y0']) {
                        return yScale(d['y0']);
                    }

                    return yScale(d['y1']);
                })
                .attr('width', xScaleBars.rangeBand())
                .attr('height', function(d) {
                    return Math.abs(yScale(d['y0']) - yScale(d['y1']));
                })
                .style('fill', function(d) {
                    return colorScale(d['name']);
                })
                .attr('class', function(d) {
                    return classify(d['name']);
                });

        /*
         * Render values to chart.
         */
        bars.selectAll('text')
            .data(function(d) {
                return d['values'];
            })
            .enter().append('text')
                .text(function(d) {
                    return d['val'];
                })
                .attr('class', function(d) {
                    return classify(d['name']);
                })
                .attr('x', function(d) {
                    return xScaleBars.rangeBand() / 2;
                })
                .attr('y', function(d) {
                    var textHeight = d3.select(this).node().getBBox().height;
                    var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));

                    var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);
                    var centerPos = barCenter + textHeight / 2;

                    if (textHeight + valueGap * 2 > barHeight) {
                        d3.select(this).classed('hidden', true);
                        return centerPos - 3;
                    } else {
                        return centerPos;
                    }
                })
                .attr('text-anchor', 'middle');
    })

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
}

/*
 * Render a stacked column chart.
 */
var renderStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var aspectWidth = config['aspectRatio']['width'];
    var aspectHeight = config['aspectRatio']['height'];
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 1,
        bottom: 20,
        left: 100
    };

    var roundTicksFactor = 50;

    if (isMobile) {
        margins['left'] = 50;
        aspectHeight += 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .rangeRoundBands([0, chartWidth], .1)

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(config['colorDomain'])
        .range(config['colorRange']);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
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
     * Render bars to chart.
     */
    var bars = chartElement.selectAll('.bars')
        .data(config['data'])
        .enter().append('g')
            .attr('class', 'bar')
            .attr('transform', function(d) {
                return makeTranslate(xScale(d[labelColumn]), 0);
            });

    bars.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .style('fill', function(d) {
                return colorScale(d['name']);
            })
            .attr('class', function(d) {
                return classify(d['name']);
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

    /*
     * Render values to chart.
     */
    bars.selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('text')
            .text(function(d) {
                return d['val'];
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d) {
                return xScale.rangeBand() / 2;
            })
            .attr('y', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));

                var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);
                var centerPos = barCenter + textHeight / 2;

                if (textHeight + valueGap * 2 > barHeight) {
                    d3.select(this).classed('hidden', true);
                    return centerPos - 3;
                } else {
                    return centerPos;
                }
            })
            .attr('text-anchor', 'middle');

    var legend = chartElement.append('g')
        .attr('class', 'legend')
        .selectAll('text')
        .data(colorScale.domain())
        .enter();

    legend.append('text')
        .text(function(d, i) {
            return d;
        })
        .attr('x', -valueGap)
        .attr('y', function(d,i) {
            var firstColumn = config['data'][0];
            var yPos = firstColumn['values'][i]['y1'] - ((firstColumn['values'][i]['y1'] - firstColumn['values'][i]['y0']) / 2)
            return yScale(yPos) - 6 + 10;
        })
        .attr('dy', 0)
        .call(wrapText, margins['left'], 14);

    legend.append('line')
        .attr('x0', 0)
        .attr('x2', function(d,i) {
            var firstColumn = config['data'][0];
            return xScale(firstColumn[labelColumn]);
        })
        .attr('y1', function(d,i) {
            var firstColumn = config['data'][0];
            var yPos = firstColumn['values'][i]['y1'] - ((firstColumn['values'][i]['y1'] - firstColumn['values'][i]['y0']) / 2)
            return yScale(yPos);
        })
        .attr('y2', function(d,i) {
            var firstColumn = config['data'][0];
            var yPos = firstColumn['values'][i]['y1'] - ((firstColumn['values'][i]['y1'] - firstColumn['values'][i]['y0']) / 2)
            return yScale(yPos);
        });

    chartElement.select('.legend')
        .append('text')
            .text('Share of American adults in each income tier')
            .attr('x', -margins['left'])
            .attr('y', 0)
            .attr('class', 'header');
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
