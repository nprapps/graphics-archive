// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var annotations = [];

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
    DATA.forEach(function(d, i) {
        d['date'] = d3.time.format('%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && key != 'annotate' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];

                if (d['annotate'] == 'yes') {
                    var annotCount = annotations.length;
                    var annotIdx = annotCount - 1;
                    var prevAnnotDate = null;
                    var prevAnnotAmt = null;
                    if (annotIdx >= 0) {
                        prevAnnotDate = annotations[annotIdx]['date'];
                        prevAnnotAmt = annotations[annotIdx]['amt'];
                    }
                    // if (annotCount == 0 || (annotCount > 0 && prevAnnotDate != d['date'] && prevAnnotAmt != d[key])) {
                    if (annotCount == 0 || (annotCount > 0 && prevAnnotAmt != d[key])) {
                        var lastItem = false;
                        if (i == DATA.length - 1) {
                            lastItem = true;
                        }

                        annotations.push({
                            'date': d['date'],
                            'amt': d[key],
                            'annotate': d['annotate'],
                            'series': key,
                            'lastItem': lastItem
                        });
                    }
                }
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (column == 'date' || column == 'annotate') {
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
            }).filter(function(d) {
                return d['amt'] != null;
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
    var aspectHeight = isMobile ? 3 : 8;

    var margins = {
        top: 25,
        right: 100,
        bottom: 20,
        left: 32
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 10;
    var labelLineHeight = 14;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['top'] = 30;
        margins['right'] = 90;
        labelLineHeight = 12;
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
        .domain([ d3.min(config['data'][0]['values'], function(d) {
            return d['date'];
        }),
        d3.max(config['data'][1]['values'], function(d) {
            return d['date'];
        })])
        .range([ 0, chartWidth ]);

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
        .range([ '#787878', '#787878', '#aaa', COLORS['teal3'] ]);

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
     * Define textures
     */
    var textureProjected = textures.lines()
        .size(4)
        .strokeWidth(1)
        .stroke('#eee');

    chartWrapper.select('svg')
        .call(textureProjected);

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
            return d + '%';
        });

    // bg shading
    chartElement.append('rect')
        .attr('class', 'forecast')
        .attr('x', xScale(d3.time.format('%Y').parse('2016')))
        .attr('width', xScale(d3.time.format('%Y').parse('2026')) - xScale(d3.time.format('%Y').parse('2016')))
        .attr('y', 0)
        .attr('height', chartHeight)
        .style('fill', textureProjected.url());

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

    // annotations
    var annot = chartElement.append('g')
        .attr('class', 'annotations');
    annot.append('line')
        .attr('x1', xScale(d3.time.format('%Y').parse('2013')))
        .attr('x2', xScale(d3.time.format('%Y').parse('2013')))
        .attr('y1', yScale(yScale.domain()[0]))
        .attr('y2', yScale(yScale.domain()[1]));
    annot.append('text')
        .text('2013: First marketplace open enrollment')
        .attr('x', xScale(d3.time.format('%Y').parse('2013')))
        .attr('y', yScale(12))
        .attr('dx', -6)
        .call(wrapText, 80, 12);
    annot.append('text')
        .text('Projected')
        .attr('x', xScale(d3.time.format('%Y').parse('2021')))
        .attr('y', -10)
        .attr('class', 'projected');

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        // .interpolate('monotone')
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

    // dots and annotations
    var dotWrapper = chartElement.append('g')
        .attr('class', 'dots');

    dotWrapper.selectAll('circle')
        .data(annotations)
        .enter().append('circle')
            .attr('cx', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('cy', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('r', 4)
            .attr('fill', function(d) {
                return colorScale(d['series']);
            });

    dotWrapper.append('g')
        .attr('class', 'vals')
        .selectAll('text')
        .data(annotations)
        .enter().append('text')
            .text(function(d, i) {
                return d[valueColumn].toFixed(1) + '%';
            })
            .attr('x', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dx', function(d, i) {
                var dxPos = 8;
                if (i == 0 || i == 1) {
                    dxPos = 3;
                } else if (i == 2) {
                    dxPos = 0;
                }
                return dxPos;
            })
            .attr('dy', function(d, i) {
                var dyPos = 2;
                if (i == 0 || i == 1) {
                    dyPos = -8;
                } else if (i == 2) {
                    dyPos = 20;
                } else if (i == 4 && !isMobile) {
                    dyPos = -32;
                } else if (i == 4 && isMobile) {
                    dyPos = -30;
                } else if (i == 5) {
                    dyPos = 5;
                } else if (i > 2 && isMobile) {
                    dyPos = 3;
                }
                return dyPos;
            })
            .classed('featured', function(d, i) {
                if (i == 5) {
                    return true;
                } else {
                    return false;
                }
            })
            .attr('fill', function(d) {
                return colorScale(d['series']);
            });

    dotWrapper.append('g')
        .attr('class', 'series')
        .selectAll('text')
        .data(annotations.filter(function(d,i) {
            return d['lastItem'] == true;
        }))
        .enter().append('text')
            .text(function(d, i) {
                return d['series'];
            })
            .classed('featured', function(d, i) {
                if (i == 2) {
                    return true;
                } else {
                    return false;
                }
            })
            .attr('x', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('y', function(d, i) {
                var yPos = yScale(d[valueColumn]);
                var yOffset = 16;
                if (i == 1) {
                    yOffset = -18;
                } else if (i == 2) {
                    yOffset = 19;
                }
                return  yPos + yOffset;
            })
            .attr('dx', 8)
            .attr('dy', 0)
            .attr('fill', function(d) {
                return colorScale(d['series']);
            })
            .call(wrapText, margins['right'] - 8, labelLineHeight);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
