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
        d['date'] = d3.time.format('%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

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

    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    dataSeries.forEach(function(d,i) {
        var chartElement = containerElement.append('div')
            .attr('class', 'chart ' + classify(d['name']));

        if (!isMobile) {
            chartElement.attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (i % 2 == 0) {
                    s += 'margin-right: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        var annotations = [];
        var color = null;
        var roundTicksFactor = null;
        var unitPrefix = null;

        switch(d['name']) {
            case 'units':
                annotations = [ 0, 11, 14, 17 ];
                color = COLORS['orange3'];
                roundTicksFactor = 100000;
                break;
            case 'cost':
                annotations = [ 0, 12, 17 ];
                color = COLORS['teal4'];
                roundTicksFactor = 2000000000;
                unitPrefix = '$';
                break;
        }

        // Render the chart!
        renderLineChart({
            container: '.chart.' + classify(d['name']),
            width: graphicWidth,
            data: [ d ],
            annotations: annotations,
            color: color,
            roundTicksFactor: roundTicksFactor,
            title: LABELS['hed_' + d['name']],
            unitPrefix: unitPrefix,
            id: d['name']
        });

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

    var aspectWidth = 4;
    var aspectHeight = 3;

    var margins = {
        top: 5,
        right: 28,
        bottom: 20,
        left: 48
    };

    if (!isMobile && config['id'] == 'cost') {
        margins['left'] = 35;
    }

    var roundTicksFactor = config['roundTicksFactor'];
    var ticksX = 10;
    var ticksY = 5;
    var unitPrefix = config['unitPrefix'];

    // Mobile
    if (isMobile) {
        margins['right'] = 28;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
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
        .range([ config['color'] ]);

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
            if ((chartWidth < 200 && i % 2 == 0) || chartWidth >= 200) {
                return '\u2019' + fmtYearAbbrev(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            switch(config['id']) {
                case 'units':
                    return fmtComma(d);
                    break;
                case 'cost':
                    var val = d / 1000000000;
                    if (d == 0) {
                        return unitPrefix + val.toFixed(0);
                    } else {
                        return unitPrefix + val.toFixed(0) + 'B';
                    }
                    break;
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

    var dotWrapper = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('g')
        .data(config['data'])
        .enter().append('g')
            .attr('class', function(d) {
                return classify(d['name']);
            });
    dotWrapper.selectAll('circle')
        .data(function(d) {
            var vals = d['values'].filter(function(a, b) {
                var isAnnotated = false;
                _.each(config['annotations'], function(v, k) {
                    if (v == b) {
                        isAnnotated = true;
                    }
                });
                if (isAnnotated) {
                    return a;
                }
            })
            _.each(vals, function(v, k) {
                v['series'] = d['name'];
            })
            return vals;
        })
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

    dotWrapper.selectAll('text')
        .data(function(d) {
            var vals = d['values'].filter(function(a, b) {
                var isAnnotated = false;
                _.each(config['annotations'], function(v, k) {
                    if (v == b) {
                        isAnnotated = true;
                    }
                });
                if (isAnnotated) {
                    return a;
                }
            })
            _.each(vals, function(v, k) {
                v['series'] = d['name'];
            })
            return vals;
        })
        .enter().append('text')
            .text(function(d, i) {
                var value = d[valueColumn];
                var label = '';
                switch(config['id']) {
                    case 'units':
                        label = fmtComma(value.toFixed(0));
                        break;
                    case 'cost':
                        var val = value / 1000000000;
                        label = unitPrefix + val.toFixed(1) + ' billion';

                        if (i == 1) {
                            label += ' ²';
                        }
                        break;
                }

                return label;
            })
            .attr('x', function(d) {
                return xScale(d[dateColumn]);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dy', function(d,i) {
                if (config['id'] == 'units' && i == 2) {
                    return 15;
                } else {
                    return -8;
                }
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
