// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values' ];
var categories = [ 'Good', 'Moderate', 'Unhealthy for sensitive groups', 'Unhealthy', 'Very unhealthy', 'Hazardous', 'No data' ];

var x_ticks = [];

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
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
        d['values'] = [];
        d['total'] = d['max'] - d['min'];

        if (d['date'].getDate() === 1 || d['date'].getDate() === 1) {
            x_ticks.push(d['date']);
        }

        // Air quality thresholds
        var thresholds = [ 50, 100, 150, 200, 300, 9999 ];
        var th_labels = categories;
        var lower = parseFloat(d['min']);

        for (var i=0; i<thresholds.length; i++) {
            var th = thresholds[i];
            var y0 = lower;
            var min = parseFloat(d['min']);
            var max = parseFloat(d['max']);

            if (isNaN(min)) {
                y0 = 0;
                y1 = 0;
                lower = 0;
            } else if (th < min) {
                y1 = min;
                lower = min;
            } else if (th < max) {
                y1 = th;
                lower = th;
            } else {
                y1 = max;
                lower = max;
            }

            d['values'].push({
                'name': th_labels[i],
                'y0': y0,
                'y1': y1,
                'val': y1 - y0,
                'avg': !isNaN(d['avg']) ? d['avg'] : null
	            })
        }
    });

    DATA_COMPARISON.forEach(function(d) {
        var x0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (skipLabels.indexOf(key) > -1) {
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

    // Render the Ulaanbaatar AQ chart!
    renderStackedColumnChart({
        container: '#air-quality-chart',
        width: containerWidth,
        data: DATA
    });

    // Render the comparison chart!
    renderStackedBarChart({
        container: '#stacked-bar-chart',
        width: containerWidth,
        data: DATA_COMPARISON
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked column chart.
 */
var renderStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'date';

    var aspectWidth = 16;
    var aspectHeight = 9;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 80,
        bottom: 20,
        left: 30
    };

    var ticksY = 5;
    var roundTicksFactor = 100;

    if (isMobile) {
        margins['left'] = 28;
        margins['right'] = 57;
        aspectWidth = 4;
        aspectHeight = 3;
    }

    // if (isMobile && chartWidth < 205) {
    //     margins['right'] = 70;
    //     // chartWidth = 205;
    // }

    // Calculate actual chart dimensions
    // var chartWidth = Math.floor((config['width'] - margins['left'] - margins['right']) / (config['data'].length + 1)) * (config['data'].length + 1);
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    if (chartHeight > 350) {
        chartHeight = 350;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ]);

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d['min'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d['max'] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([chartHeight, 0]);

    /*
     * Render the legend.
     */
    var legend_wrap = containerElement.append('div')
        .attr('class', 'legend-wrap');

    legend_wrap.append('h3')
        .html(LEGEND_TITLE);

    var legend = legend_wrap.append('ul')
		.attr('class', 'key')
		.selectAll('g')
      .data(categories)
			// .data(categories.filter(function(d,i) {
      //   return d != 'No data';
      // }))
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b')
        .text(function(d,i) {
            var label_ranges = ['0-50', '51-100', '101-150','151-200','201-300','301-500', 'n/a'];
            return label_ranges[i];
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
        .attr('width', config['width'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var ticksX = x_ticks;
    if (isMobile) {
        ticksX = [ x_ticks[0], x_ticks[3], x_ticks[6], x_ticks[9], x_ticks[12] ];
    }

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(ticksX)
        .tickFormat(function(d) {
          return getAPMonth(d);
          // return getAPMonth(d) + ' ' + d.getDate()
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
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
        .call(yAxis);

    /*
     * Render highlighted time periods
     */
    var bar_w = (chartWidth / config['data'].length) > 2 ? (chartWidth / config['data'].length): (chartWidth / config['data'].length);
    highlight_g = chartElement.append('g')
        .attr('class', 'highlights');

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
    var bars = chartElement.selectAll('.bar')
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
            .attr('width', bar_w)
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('class', function(d) {
                return classify(d['name']);
            });

    // Add average
		var line = d3.svg.line()
        //.interpolate('monotone')
        .interpolate('step-after')
        .defined(function(d) {
            return d['avg'] != null && d['avg'] != 0;
        })
        .x(function(d) {
            return xScale(d[labelColumn]);
        })
        .y(function(d) {
            return yScale(d['avg']);
        });

    var line_data = config['data'];

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data([line_data])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line';
            })
            .attr('d', function(d) {
                return line(d);
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
     * Render side labels
     */
    var annos_g = chartElement.append('g')
        .attr('class', 'annos-g');

    var last_item = config['data'][config['data'].length - 2];

    annos_g.append('line')
        .attr('class', 'anno-leader anno-avg')
        .attr('x1', chartWidth - bar_w + 2)
        .attr('x2', chartWidth + bar_w + 10)
        .attr('y1', yScale(last_item['avg']) - 1)
        .attr('y2', yScale(last_item['avg']) - 1)

    annos_g.append('text')
        .attr('class', 'anno-label anno-avg')
        .attr('x', chartWidth + bar_w + 12)
        .attr('y', yScale(last_item['avg']) + 3)
        .text('Daily average')
        .call(wrapText, config['width'] - chartWidth - margins['left'] - 15, 12)
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
    var labelWidth = 85;
    var labelMargin = 10;
    var valueGap = 6;
    var maxWidth = 650;

    var margins = {
        top: 0,
        right: 25,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = [ 0, 100, 200, 300, 365 ];

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    if (config['width'] > maxWidth) {
      chartWidth = maxWidth - margins['left'] - margins['right'];
    }
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var min = 0;
    var max = 365;

    var xScale = d3.scale.linear()
        .domain([min, max])
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
        .tickValues(ticksX)
        .tickFormat(function(d, i) {
            var suffix = i == (ticksX.length - 1) ? ' days' : '';
            return d + suffix;
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
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
