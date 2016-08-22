// Global vars
var pymChild = null;
var isMobile = false;
var dataSeriesActual = [];
var dataSeriesChange = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        dataSeriesActual = formatLineData(DATA_ACTUAL);
        DATA_CHANGE = formatBarData(DATA_CHANGE);

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
var formatLineData = function(data) {
    var dataSeries = [];

    data.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in data[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': data.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
    // filter out empty data. uncomment this if you have inconsistent data.
    //        }).filter(function(d) {
    //            return d['amt'].length > 0;
            })
        });
    }
     return dataSeries;
}

var formatBarData = function(data) {
    data.forEach(function(d) {
        d['key'] = d['Group'];
        d['values'] = [];

        _.each(d, function(v, k) {
            if (_.contains(['Group', 'key', 'values'], k)) {
                return;
            }

            d['values'].push({ 'label': k, 'amt': +v });
            delete d[k];
        });

        delete d['Group'];
    });

    return data;
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

    var graphicWrapper = d3.select('#graphic');
    graphicWrapper.html('');

    graphicWrapper.append('div')
        .attr('class', 'graphic')
        .attr('id', 'bar-chart-renew');

    graphicWrapper.append('div')
        .attr('class', 'graphic')
        .attr('id', 'line-chart-actual');

    // Render the chart!
    // Render the line chart first so we can grab the height for the bullet chart
    renderLineChart({
        container: '#line-chart-actual',
        width: isMobile ? containerWidth : containerWidth * 0.48,
        data: dataSeriesActual,
        chartHed: COPY['chart_hed_2'],
        chartSub: COPY['chart_sub_2']
    });

    renderBulletChart({
        container: '#bar-chart-renew',
        width:  isMobile ? containerWidth : containerWidth * 0.48,
        data: DATA_CHANGE,
        chartHed: COPY['chart_hed_1'],
        chartSub: COPY['chart_sub_1']
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

    var aspectWidth = isMobile ? 9 : 9;
    var aspectHeight = isMobile ? 8 : 9;

    var margins = {
        top: 5,
        right: 110,
        bottom: 20,
        left: 33
    };

    var ticksX = 5;
    var ticksY = 6;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 40;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    if (chartHeight < 260) {
        chartHeight = 260;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h1')
        .text(config['chartHed']);

    containerElement.append('h3')
        .text(config['chartSub']);

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

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['red3'], COLORS['orange3'], COLORS['yellow3'], COLORS['blue3'], COLORS['teal3'], '#777']);

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
            return '\u2019' + fmtYearAbbrev(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d,i) {
            if (d > 0) {
                return d + '%';
            } else {
                return d;
            }
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
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        //.interpolate('monotone')
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

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('class', function(d) {
                return classify(d['name']);
            })
            //.attr('fill', function(d) {
                //return colorScale(d['name']);
            //})
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d,i) {
                var last = d['values'][d['values'].length - 1];
                var placement = STYLE_DATA[i]['placement'];
                var offset = 0;
                var offset_val = isMobile ? 5 : 10;

                if (placement) {
                    if (placement === 'up') {
                        offset = -offset_val;
                    } else if (placement === 'down') {
                        offset = offset_val;
                    }
                }

                return yScale(last[valueColumn]) + 3 + offset;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = (last[valueColumn]);

                var label = value.toFixed(1) + '%';

                if (!isMobile) {
                    label = d['name'] + ': ' + label;
                }

                return label;
            })
            .call(wrapText, margins['right'] - 5, 12);
}

/*
 * Render a bar chart.
 */
var renderBulletChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var numGroups = config['data'].length;
    var numGroupBars = config['data'][0]['values'].length;

    var labelWidth = 80;
    var labelMargin = 0;
    var valueGap = 6;

    var margins = {
        top: 12,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var svgHeight = d3.select('#line-chart-actual').select('svg').attr('height');

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = svgHeight - margins['top'] - margins['bottom'];

    var barHeight = 35;
    var barGap = 0;
    var groupHeight = ((chartHeight - barHeight) / (numGroups-1));

    var ticksX = 4;
    var roundTicksFactor = 50000;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h1')
        .text(config['chartHed']);

    containerElement.append('h3')
        .text(config['chartSub']);

    /*
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    var yScale = d3.scale.linear()
        .range([chartHeight, 0]);

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
            return fmtComma((d/1000).toFixed(1));
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
    var barGroups = chartElement.selectAll('.bars')
        .data(config['data'])
        .enter()
        .append('g')
            .attr('class', function(d) {
                return 'g bars bar-g-' + classify(d['key']);
            })
            .attr('transform', function(d, i) {
                //if (i == 0) {
                    //return makeTranslate(0, 0);
                //}

                return makeTranslate(0, (groupHeight + barGap) * i);
            });

    barGroups.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter()
        .append('rect')
            .attr('x', function(d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                if (i == 0) {
                    return 0;
                }

                return barHeight / 4;
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('height', function(d,i) {
                if (i == 0) {
                    return barHeight;
                }

                return barHeight / 2;
            })
            .attr('class', function(d) {
                return 'y-' + classify(d[labelColumn]);
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
            .attr('style', function(d,i) {
                var top = (groupHeight + barGap) * i;

                if (i == 0) {
                    top = 0;
                }

                return formatStyle({
                    'width': (labelWidth - 10) + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': top + 'px;'
                });
            })
            .attr('class', function(d,i) {
                return classify(d['key']);
            })
            .append('span')
                .text(function(d,i) {
                    return d['key']
                });

    /*
     * Render bar values.
     */
    [0,1].forEach(function(k,v) {
        barGroups.append('g')
            .attr('class', 'value value-' + v)
            .append('text')
                .text(function(d,i) {
                    var val = fmtComma((d['values'][v][valueColumn]/1000).toFixed(1));
                    var label_text = val;

                    if (i === 0) {
                        label_text = val + ' ' + d['values'][v][labelColumn].toLowerCase();
                    }
                    return label_text;
                })
                .attr('x', function(d) {
                    return xScale(d['values'][v][valueColumn]);
                })
                .attr('y', function(d, i) {
                    return 0;
                })
                .attr('dx', function(d) {
                    var value_column = d['values'][v][valueColumn];
                    var xStart = xScale(value_column);
                    var textWidth = this.getComputedTextLength()

                    if (v === 0) {
                        //if (xStart > textWidth) {
                            //return -textWidth;
                        //} else {
                            return -xStart + 2;
                        //}
                    } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    }

                    //if (xStart + valueGap + textWidth > chartWidth) {
                        //d3.select(this).classed('in', true)
                        //return -(valueGap + textWidth);
                    //} else {
                        //d3.select(this).classed('out', true)
                        //return valueGap;
                    //}
                })
                .attr('dy', v === 0 ? -3 : (barHeight / 2) + 4);
    });

    var firstLabel = chartElement.select('.value-1').select('text');
    firstLabel
        .call(wrapText, chartWidth - firstLabel.attr('x'), 12);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
