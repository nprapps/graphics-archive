// Global vars
var pymChild = null;
var charts = [];
var isMobile = false;
var isPromo = false;
var skipLabels = [ 'label', 'values', 'chart', 'total' ];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        if (d3.select('body').classed('promo')) {
            isPromo = true;
        }

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

        d['values'] = [];
        d['total'] = +d['total'];

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

    charts = _.uniq(_.pluck(DATA, 'chart'));
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - (gutterWidth * 2)) / 2);
    }

    // define colorScale
    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(DATA[0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ COLORS['red4'], COLORS['blue4'], COLORS['yellow4'], '#ccc' ]);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#stacked-bar-chart');
    containerElement.html('');

    renderLegend({
        container: '#stacked-bar-chart',
        colorScale: colorScale
    });

    charts.forEach(function(d, i) {
        var chartData = DATA.filter(function(v,k) {
            return v['chart'] == d;
        });

        var chartElement = containerElement.append('div')
            .attr('class', 'chart chart-' + i + ' ' + classify(d));

        if (!isMobile) {
            chartElement.attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (i == 0) {
                    s += 'margin-right: ' + gutterWidth + 'px; ';
                }
                if (i > 0) {
                    s += 'padding-left: ' + (gutterWidth - 1) + 'px; ';
                    s += 'border-left: 1px solid #ccc; ';
                }
                return s;
            });
        }

        var roundTicksFactor = null;
        switch(d) {
            case 'House':
                roundTicksFactor = 50;
                break;
            case 'Senate':
                roundTicksFactor = 20;
                break;
        }

        // Render the chart!
        renderStackedBarChart({
            container: '.chart.chart-' + i,
            width: graphicWidth,
            data: chartData,
            title: d,
            colorScale: colorScale,
            majority: LABELS[ classify(d) + '_majority'],
            roundTicksFactor: roundTicksFactor
        });

    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render legend
 */
var renderLegend = function(config) {
    var colorScale = config['colorScale'];
    var container = config['container'];

    var containerElement = d3.select(container);

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
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 95;
    var labelMargin = 10;
    var valueGap = 6;

    var margins = {
        top: 22,
        right: 10,
        bottom: 18,
        left: (labelWidth + labelMargin)
    };

    if (isPromo) {
        barHeight = 60;
        labelWidth = 110;
        margins['left'] = labelWidth + labelMargin;
    }

    var ticksX = 4;
    var roundTicksFactor = config['roundTicksFactor'];

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    // header
    containerElement.append('h3')
        .text(config['title'])
        .attr('style', 'margin-left: ' + margins['left'] + 'px;');

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

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

    var colorScale = config['colorScale'];

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
    //  chartElement.append('g')
    //     .attr('class', 'value')
    //     .selectAll('text')
    //     .data(config['data'])
    //     .enter().append('text')
    //         .text(function(d) {
    //             return d['total'];
    //         })
    //         .attr('class', function(d) {
    //             return classify(d['label']);
    //         })
    //         .attr('x', function(d) {
    //             return chartWidth + margins['right'] - 2;
    //         })
    //         .attr('y', function(d,i) {
    //             return i * (barHeight + barGap);
    //         })
    //         .attr('dy', (barHeight / 2) + 3)

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
                    return d[labelColumn] + ': ' + d['total'];
                });

    // annotation
    var annotation = chartElement.append('g')
        .attr('class', 'annotation');

    var majority = +config['majority'];

    annotation.append('text')
        .text('Majority: ' + majority.toFixed(0))
        .attr('x', xScale(config['majority']))
        .attr('y', -12);

    annotation.append('line')
        .attr('x1', xScale(config['majority']))
        .attr('x2', xScale(config['majority']))
        .attr('y1', -5)
        .attr('y2', chartHeight);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
