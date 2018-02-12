// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values' , 'chart' ];
var charts = ['the deficit', 'health care', 'immigration', 'isis', 'north korea', 'trade'];

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

        d['values'] = [];

        for (var key in d) {
            if (_.contains(skipLabels, key)) {
                continue;
            }

            if (key != 'Chart') {
              d[key] = +d[key];

              var x1 = x0 + d[key];

              d['values'].push({
                  'bar-label': d['label'],
                  'name': key,
                  'x0': x0,
                  'x1': x1,
                  'val': d[key]
              })
            }

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

    var dataFilters = {
        'health care' : function(d) {
            return d.chart === 'health care';
        },
        'isis' : function(d) {
            return d.chart === 'isis';
        },
        'north korea' : function(d) {
            return d.chart === 'north korea';
        },
        'trade' : function(d) {
            return d.chart === 'trade';
        },
        'the deficit' : function(d) {
            return d.chart === 'the deficit';
        },
        'immigration' : function(d) {
            return d.chart === 'immigration';
        }
    };

    // Clear existing graphic (for redraw)
    var chartWrapper = d3.select('#chart-wrapper');
    chartWrapper.html('');

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(DATA[0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ COLORS['teal3'], '#ccc', COLORS['orange3'], COLORS['blue3'] ]);

    /*
     * Render the legend.
     */
    var legend = chartWrapper.append('ul')
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

        // Loop through array to build multiple charts
        charts.forEach(function(slug) {
            var thisChart = 'chart-' + classify(slug);
            var thisChartData = DATA.filter(dataFilters[slug]);

            var chartElement = chartWrapper.append('div')
            .attr('id', thisChart)
            .attr('class', 'chart ' + thisChart + '-wrapper');

            // Render the chart!
            renderStackedBarChart({
                container: '#' + thisChart,
                width: containerWidth,
                data: thisChartData,
                header: slug
            });
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

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
    var labelWidth = 75;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 20,
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

    // colorScale
    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(DATA[0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ COLORS['teal3'], '#ccc', COLORS['orange3'], COLORS['blue3'] ]);

    var mutedColorScale = d3.scale.ordinal()
        .domain(d3.keys(DATA[0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ '#5aa09f', '#d5d5d5', '#ecaa63', COLORS['blue3'] ]);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');
    containerElement.append('h3').text(config['header']);

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
        .domain([min, 100])
        .rangeRound([0, chartWidth]);

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
            return (d != 0) ? d + '%' : d;
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
                 return (d['bar-label'] != 'Overall') ? mutedColorScale(d['name']) : colorScale(d['name']);
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
                    'top': (i * (barHeight + barGap)) + 'px'
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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
