// Global vars
var pymChild = null;
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
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    ANNO_DATA.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
        d['mobile_offset'] = +d['mobile_offset'];
        d['desktop_offset'] = +d['desktop_offset'];
    });

    LABEL_DATA['pointDate'] = d3.time.format('%m/%d/%Y').parse(LABEL_DATA['pointDate']);

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

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 4.5 : 9;

    var textLineHeight = isMobile ? 11 : 14;

    var margins = {
        top: 5,
        right: 85,
        bottom: 20,
        left: 23
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 20;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 65;
        margins['bottom'] = 125;
        margins['top'] = 60;
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
        .range([COLORS['teal3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

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
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

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
     * Render annotation lines.
     */
    var annoGroup = chartElement.append('g')
        .attr('class', 'annotations');

    var annoY = isMobile ? chartHeight + 45 : chartHeight - 20;

    annoGroup.selectAll('line')
        .data(ANNO_DATA)
            .enter()
        .append('line')
            .attr('x1', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('x2', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('y1', 0)
            .attr('y2', function(d) {
                return isMobile && d['position'] != 'top' ? chartHeight + 25 : chartHeight
            });

    annoGroup.selectAll('.anno-date')
        .data(ANNO_DATA)
            .enter()
        .append('text')
            .attr('class', 'anno-date')
            .text(function(d) {
                return d['ap_date'];
            })
            .attr('x', function(d) {
                var offset;
                if (isMobile) {
                    offset = d['mobile_offset'] || -20;
                } else {
                    offset = d['anchor'] == 'start' ? 5 : d['anchor'] == 'end' ? -5 : 0;
                }
                return xScale(d[dateColumn]) + offset;
            })
            .attr('y', function(d) {
                if (d['position'] == 'top') {
                    if (isMobile) {
                        return -50;
                    } else {
                        return 15;
                    }
                } else {
                    var desktopOffset = isMobile ? 0 : d['desktop_offset'];
                    return annoY - textLineHeight + desktopOffset;
                }
            })
            .attr('text-anchor', function(d, i) {
                return isMobile ? 'start' : d['anchor'];
            });

    annoGroup.selectAll('.anno-text')
        .data(ANNO_DATA)
            .enter()
        .append('text')
            .attr('class', 'anno-text')
            .html(function(d) {
                return d['annotation'];
            })
            .attr('x', function(d) {
                var offset;
                if (isMobile) {
                    offset = d['mobile_offset'] || -20;
                } else {
                    offset = d['anchor'] == 'start' ? 5 : d['anchor'] == 'end' ? -5 : 0;
                }
                return xScale(d[dateColumn]) + offset;
            })
            .attr('y', function(d) {
                if (d['position'] == 'top') {
                    if (isMobile) {
                        return -50 + textLineHeight;
                    } else {
                        return 15 + textLineHeight;
                    }
                } else {
                    var desktopOffset = isMobile ? 0 : d['desktop_offset'];
                    return annoY + desktopOffset;
                }
            })
            .attr('text-anchor', function(d, i) {
                return isMobile ? 'start' : d['anchor'];
            })
            .call(wrapText, isMobile ? 70 : 130, textLineHeight);

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

    var valueGroup = chartElement.append('g')
        .attr('class', 'value');

    var lastValue = config['data'][0]['values'][config['data'][0]['values'].length - 1];

    valueGroup
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('class', 'label-highlight')
            .attr('x', chartWidth + 5)
            .attr('y', yScale(lastValue[valueColumn]) + 3)
            .text(lastValue[valueColumn].toFixed(0) + ' percent');

    valueGroup.append('text')
        .attr('class', 'value-label')
        .text('in ' + LABEL_DATA['endLabel'])
        .attr('x', chartWidth + 5)
        .attr('y', yScale(lastValue[valueColumn]) + 3 + textLineHeight)
        .call(wrapText, margins['right'], textLineHeight);

    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('g')
        .data(config['data'])
            .enter().append('g')
            .attr('fill', function(d) {
                return colorScale(d['name']);
            })
        .selectAll('circle')
        .data(function(d) { return d['values']; })
        .enter().append('circle')
            .attr('class', function(d,i) {
                return i < 7 ? 'circle-show' : 'circle-hide';
            })
            .attr('r', 4)
            .attr('cx', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('cy', function(d) {
                return yScale(d[valueColumn]);
            });

    var pointLabel = chartElement.append('g')
        .attr('class', 'point-label');

    pointLabel.append('text')
        .attr('class', 'point-label label-text')
        .text(LABEL_DATA['pointLabelEnd'])
        .attr('x', xScale(LABEL_DATA['pointDate']) + 20)
        .attr('y', yScale(LABEL_DATA['pointValue']) + 20);

    pointLabel.append('text')
        .attr('class', 'point-label label-highlight')
        .text(LABEL_DATA['pointLabelHighlight'])
        .attr('x', xScale(LABEL_DATA['pointDate']) + 20)
        .attr('y', yScale(LABEL_DATA['pointValue']) + 20 - textLineHeight);

    pointLabel.append('text')
        .attr('class', 'point-label label-text')
        .text(LABEL_DATA['pointLabelStart'])
        .attr('x', xScale(LABEL_DATA['pointDate']) + 20)
        .attr('y', yScale(LABEL_DATA['pointValue']) + 20 - (2 * textLineHeight));
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
