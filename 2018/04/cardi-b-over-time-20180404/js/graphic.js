// Global vars
var pymChild = null;
var isMiddle = false;
var isMobile = false;
var dataSeries = [];

/*
 * Initialize graphic
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
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });
    ANNOTS.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);
        d['img_ratio'] = +d['img_ratio'];
        d['x_offset'] = +d['x_offset'];
        d['y_offset'] = +d['y_offset'];
    })

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': DATA.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
    // filter out empty data. uncomment this if you have inconsistent data.
    //        }).filter(function(d) {
    //            return d['amt'] != null;
            })
        });
    }
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MIDDLE_THRESHOLD) {
        isMiddle = true;
    } else {
        isMiddle = false;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderLineChart({
        container: '#line-chart',
        width: containerWidth,
        data: dataSeries
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : isMiddle ? 4 : 16;
    var aspectHeight = isMobile ? 4 : isMiddle ? 3 : 9;

    var margins = {
        top: 60,
        right: 138,
        bottom: 60,
        left: 15
    };

    var ticksX = 10;
    var ticksY = 5;
    var roundTicksFactor = 0.1;

    if (isMiddle) {
        ticksX = 5;
        margins['right'] = 125;
    }

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 5;
        margins['top'] = 50;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (min > 0) {
        min = 0;
    }

    // var max = d3.max(config['data'], function(d) {
    //     return d3.max(d['values'], function(v) {
    //         return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
    //     })
    // });

    var max = 1.0;

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range(['#e561aa', COLORS['yellow3']]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
        .data(config['data'])
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item ' + classify(d['name']);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d['name']);
        });

    legend.append('label')
        .text(function(d) {
            return d['name'];
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
        .tickFormat(function(d, i) {
            if (isMobile) {
                return getAPMonth(d) + ' ' + fmtYearFull(d);
            } else {
                return getAPMonth(d) + ' ' + fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            if (d === 1) {
                return (d * 100) + '% of maximum plays';
            } else if (d === 0) {
                return d.toFixed(0);
            } else {
                return (d * 100) + '%';
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.selectAll('.tick text')
        .call(wrapText, 18, 13);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis)
        .selectAll('text')
        .style('text-anchor', 'start');

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

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
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(config['data'])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    var textValues = chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .text(function(d) {
                return isMobile ? '' : d['name'];
            });

    if (isMiddle) {
        textValues.call(wrapText, margins['right'] - 5, 12);
    }

    // add tick labels here

    d3.selectAll(".y.axis .tick").each(function(d,i){
      var tick = d3.select(this),
          line = tick.select('line'),
          text = tick.select('text'),
          box = text.node().getBBox();

      line.attr('x1', 0)
        .attr('x2', chartWidth);

      tick.insert('rect', ':nth-child(2)')
        .attr('x', box.x - 3)
        .attr('y', box.y - 3)
        .attr('height', box.height + 6)
        .attr('width', box.width + 6)
        .style('fill', '#fff');
    });


    /*
     * Render annotations to chart
     */
    var annots = chartElement.append('g')
        .attr('class', 'annotations');

    var annotTextWidth = isMiddle ? 125 : 155;
    var annotImageWidth = isMiddle ? 31 : 40;
    var annotImageMargin = isMobile ? 5 : 7;

    annots.selectAll('text')
        .data(ANNOTS)
        .enter().append('text')
            .html(function(d) {
                if (!isMobile) {
                    return d['annotation'];
                }
            })
            .attr('x', function(d) {
                var imgOffset = d['alignment'] == 'start' ? annotImageWidth + annotImageMargin + 2 : -(annotImageWidth + annotImageMargin + 2);
                return xScale(d['date']) + d['x_offset'] + imgOffset;
            })
            .attr('y', function(d) {
                return yScale(d['value']) + d['y_offset'];
            })
            .style('text-anchor', function(d) {
                return d['alignment'];
            });

    annots.selectAll('text:not(:first-child)').call(wrapText, annotTextWidth, 12);
    var firstChildWrap = isMiddle? annotTextWidth - 40 : annotTextWidth - 70;
    annots.select('text:first-child').call(wrapText, firstChildWrap, 12);

    annots.selectAll('image')
        .data(ANNOTS)
            .enter().append('image')
        .attr('xlink:href', function(d) {
            return 'img/' + d['img'];
        })
        .attr('width', annotImageWidth)
        .attr('height', function(d) {
            return d['img_ratio'] * annotImageWidth;
        })
        .attr('x', function(d) {
            var imgOffset = d['alignment'] == 'start' ? 2 : -annotImageWidth - 2;
            return xScale(d['date']) + d['x_offset'] + imgOffset;
        })
        .attr('y', function(d) {
            return yScale(d['value']) + d['y_offset'] - 12;
        });

    annots.selectAll('line')
        .data(ANNOTS)
        .enter().append('line')
            .attr('class', 'lines annotation-lines')
            .attr('x1', function(d) {
                return xScale(d['date']);
            })
            .attr('x2', function(d) {
                return xScale(d['date']);
            })
            .attr('y1', chartHeight)
            .attr('y2', function(d) {
                return yScale(d['value']);
            });

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
