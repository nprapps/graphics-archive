// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var annotations = [];
var skipLabels = [ 'date', 'month', 'annotate', 'x_offset', 'y_offset' ];
var timeColors = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData(DATA, dataSeries);

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
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function(data, series) {
    var sets = [ data, DATA_CHANGE ];
    _.each(sets, function(v,k) {
        thisSet = eval(v);

        thisSet.forEach(function(d) {
            switch(v) {
                case data:
                    d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
                    break;
                case DATA_CHANGE:
                    d['date'] = +d['month'];
                    break;
            }

            for (var key in d) {
                if (!_.contains(skipLabels, key) && d[key] != null && d[key].length > 0) {
                    d[key] = +d[key];
                }
            }

            if (d['annotate'] == 'yes') {
                annotations.push({
                    'date': d['date'],
                    'amt': d['amt'],
                    'x_offset': +d['x_offset'],
                    'y_offset': +d['y_offset']
                });
            }
        });

        /*
         * Restructure tabular data for easier charting.
         */
        dataSeries[k] = [];

        for (var column in thisSet[0]) {
            if (_.contains(skipLabels, column)) {
                continue;
            }

            dataSeries[k].push({
                'name': column,
                'values': thisSet.map(function(d) {
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
    });

    PREZ_DATES.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
    });

    TIME_PERIODS.forEach(function(d) {
        d['begin'] = d3.time.format('%m/%d/%Y').parse(d['begin']);
        d['end'] = d3.time.format('%m/%d/%Y').parse(d['end']);

        var c = COLORS[d['color']];
        var t = textures.lines()
            .size(4)
            .strokeWidth(1)
            .stroke(c);

        timeColors.push({
            color: d['color'],
            texture: t
        })
    });
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
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    var aspectWidth = isMobile ? 16 : 4;
    var aspectHeight = isMobile ? 10 : 3;

    var margins = {
        top: 25,
        right: 90,
        bottom: 50,
        left: 40
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    // Render the chart!
    var chartLT = containerElement.append('div')
        .attr('class', 'chart long-term');

    renderLongTermLineChart({
        container: '#line-chart .chart.long-term',
        width: graphicWidth,
        data: dataSeries[0],
        title: LABELS['hed_longterm'],
        margins: margins,
        aspectWidth: aspectWidth,
        aspectHeight: aspectHeight
    });

    var chartCH = containerElement.append('div')
        .attr('class', 'chart change');

    renderChangeLineChart({
        container: '#line-chart .chart.change',
        width: graphicWidth,
        data: dataSeries[1],
        title: LABELS['hed_change'],
        margins: margins,
        aspectWidth: aspectWidth,
        aspectHeight: aspectHeight
    });

    if (!isMobile) {
        var chartWrappers = [ chartLT, chartCH ];
        _.each(chartWrappers, function(v,k) {
            eval(v).attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (k > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
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
 * Render a line chart.
 */
var renderLongTermLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = config['aspectWidth'];
    var aspectHeight = config['aspectHeight'];

    var margins = config['margins'];

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 10000;

    // if (isMobile) {
    //     margins['bottom'] = 20;
    // }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h3')
        .html(config['title']);

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
        min = 13000;
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
        .range([ '#666' ]);

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
     * append textures
     */
    timeColors.forEach(function(d, i) {
        chartWrapper.select('svg').call(d['texture']);
    });

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            var val = d/1000;
            if (val != 0) {
                return val + 'M';
            } else {
                return val;
            }
        });

    var timePeriods = chartElement.append('g')
        .attr('class', 'time-periods')
        .selectAll('rect')
        .data(TIME_PERIODS)
        .enter()
            .append('rect')
                .attr('x', function(d) {
                    return xScale(d['begin']);
                })
                .attr('width', function(d) {
                    return xScale(d['end']) - xScale(d['begin']);
                })
                .attr('y', 0)
                .attr('height', chartHeight)
                .attr('fill', function(d,i) {
                    return timeColors[i]['texture'].url();
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
     * Mark presidential terms
     */
    chartElement.append('g')
        .attr('class', 'prez-terms')
        .selectAll('line')
        .data(PREZ_DATES)
        .enter()
            .append('line')
            .attr('x1', function(d) {
                return xScale(d['date']);
            })
            .attr('y1', 0)
            .attr('x2', function(d) {
                return xScale(d['date']);
            })
            .attr('y2', chartHeight);

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

    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('text')
        .data(annotations)
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['date']);
            })
            .attr('cy', function(d) {
                return yScale(d['amt']);
            })
            .attr('fill', function(d) {
                return colorScale('amt');
            })
            .attr('r', 4);

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(annotations)
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d['date']);
            })
            .attr('y', function(d) {
                return yScale(d['amt']);
            })
            .attr('dx', function(d,i) {
                return d['x_offset'] || 8;
            })
            .attr('dy', function(d, i) {
                return d['y_offset'] || 3;
            })
            .text(function(d) {
                return (d['amt']/1000).toFixed(1) + ' million';
            });
            // .call(wrapText, 80, 13);

    chartElement.append('g')
        .attr('class', 'prez-terms')
        .selectAll('text')
        .data(PREZ_DATES)
        .enter().append('text')
            .attr('x', function(d){
                return xScale(d['date']);
            })
            .attr('y', -8)
            .attr('dx', -3)
            .text(function(d){
                return d['text'];
            })
}

/*
 * Render a line chart.
 */
var renderChangeLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = config['aspectWidth'];
    var aspectHeight = config['aspectHeight'];

    var margins = config['margins'];

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 500;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);

    containerElement.append('h3')
        .html(config['title']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.linear()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var yScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'));

    TIME_PERIODS.forEach(function(d,i) {
        colorScale.range().push(COLORS[d['color_line']]);
    })

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

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d != 0) {
                var prefix = '';
                if (d > 0) {
                    prefix = '+';
                }
                return prefix + (d/1000).toFixed(1) + 'M';
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
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
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
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d, i) {
                var last = d['values'][d['values'].length - 1];
                var offset = 3;

                switch(i) {
                    case 1:
                        offset = -14;
                        break;
                    case 2:
                        offset = 10;
                        break;
                }

                return yScale(last[valueColumn]) + offset;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];
                if (last[valueColumn] > 0) {
                    value = '+' + value;
                }

                var label = d['name'] + ': ' + value + 'K';

                return label;
            })
            .call(wrapText, margins['right'] - 5, 12);

    chartElement.append('text')
        .attr('class', 'axis-label')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 32)
        .text('Months in office');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
