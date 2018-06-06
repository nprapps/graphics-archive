// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var natDataSeries = [];
var recession_dates = [{
    'begin': '12-01-2007',
    'end': '06-01-2009'
}];
var legendData = ['Metropolitan statistical area (quarterly)', 'National (annual)'];

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
                d[key] = +d[key] * 100;
            }
        }
    });

    NAT_DATA.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key] * 100;
            }
        }
    });

    recession_dates.forEach(function(d) {
        d['begin'] = d3.time.format('%m-%d-%Y').parse(d['begin']);
        d['end'] = d3.time.format('%m-%d-%Y').parse(d['end']);
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
           }).filter(function(d) {
               return d['amt'] != null;
            })
        });
    }

    for (var column in NAT_DATA[0]) {
        if (column == 'date') {
            continue;
        }

        natDataSeries.push({
            'name': column,
            'values': NAT_DATA.map(function(d) {
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

    var graphicWidth = null,
        gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#chart-wrapper');
    containerElement.html('');

    var slug, container, yAxisType, chartContainer;

    /*
     * Render the HTML legend.
     */

    var colorScale = d3.scale.ordinal()
        .domain(legendData)
        .range([COLORS['orange3'], 'rgb(169, 195, 195)']);

    var legend = containerElement.append('ul')
        .attr('class', 'key text-wrapper')
        .selectAll('g')
        .data(legendData)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item ' + classify(d);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
        });

    dataSeries.forEach(function(d, i) {
        slug = classify(d['name']);
        container = 'chart-' + slug;
        natData = natDataSeries[0];

        switch (slug) {
            case 'single-family-home-and-condos-flipped':
                yAxisType = 'num';
                break;
            case 'home-flipping-rate':
                yAxisType = 'rate';
                break;
            default:
                yAxisType = 'rate';
        }

        if (isMobile) {
            graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
        } else {
            graphicWidth = Math.floor((containerWidth - gutterWidth) / 3);
        }

        chartContainer = containerElement.append('div')
            .attr('class', 'chart chart-national chart-' + slug)
            .attr('id', container);

        // Render the chart!
        renderLineChart({
            slug: slug,
            container: '#' + container,
            width: graphicWidth,
            data: [d],
            natData: [natData],
            chartHead: d['name'],
            yAxisType: yAxisType
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
    console.log(config['data']);
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 40,
        bottom: 20,
        left: 32
    };

    var ticksX = 10;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 6;
        ticksY = 5;
        margins['right'] = 42;
    }

    // Price
    if (config['yAxisType'] == 'num') {
        roundTicksFactor = 50000;
        ticksY = 7;
        margins['left'] = 50;

        if (isMobile) {
            margins['left'] = 35;
        }
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var header = containerElement.append('g')
        .attr('class', 'chart-headers')
        .data(config['data']);

    header.append('h3')
        .attr('class', function(d) {
            var last = d['values'][d['values'].length - 1];
            var value = last[valueColumn];

            if (value < 10) {
                return 'header-msa ' + classify(d['name']);
            } else {
                return 'header-nat ' + classify(d['name']);
            }
        })
        .text(config['chartHead']);

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

    if (config['yAxisType'] == 'rate') {
        max = 20;
    }

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['orange3']]);

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
             if (i % 2) {
                 if (isMobile) {
                     return '\u2019' + fmtYearAbbrev(d);
                 } else {
                     return '\u2019' + fmtYearAbbrev(d);
                 }
             }
         });

     var yAxis = d3.svg.axis()
         .scale(yScale)
         .orient('left')
         .ticks(ticksY)
         .tickFormat(function(d, i) {
             if (d == 0) {
                 return d;
             } else {
                 if (config['yAxisType'] == 'rate') {
                     return d + '%';
                 } else {
                     if (isMobile) {
                         return fmtComma(d / 1000) + 'K';
                     } else {
                         return fmtComma(d);
                     }
                 }
             }
         });

    var recession = chartElement.append('g')
         .attr('class', 'recession');

    recession.selectAll('rect')
     .data(recession_dates)
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
             .attr('fill', '#ebebeb');

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

    // National line
    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(config['natData'])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return 'rgb(169, 195, 195)';
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    if (config['slug'] == 'phoenix-mesa-scottsdale-ariz') {
        chartElement.append('g')
            .attr('class', 'value')
            .selectAll('text')
            .data(config['natData'])
            .enter().append('text')
                .attr('x', function(d, i) {
                    var last = d['values'][d['values'].length - 1];

                    return xScale(last[dateColumn]) + 5;
                })
                .attr('y', function(d) {
                    var last = d['values'][d['values'].length - 1];

                    return yScale(last[valueColumn]) + 8;
                })
                .text(function(d) {
                    var last = d['values'][d['values'].length - 1];
                    var value = last[valueColumn];

                    var label = last[valueColumn].toFixed(1);

                    if (config['yAxisType'] == 'rate') {
                        label = label + '%';
                    } else {
                        label = fmtComma(label);
                    }

                    return label;
                });
    }

    // MSA lines
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
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = last[valueColumn].toFixed(1);

                if (config['yAxisType'] == 'rate') {
                    label = label + '%';
                } else {
                    label = fmtComma(label);
                }

                return label;
            });



    if (config['slug'] == 'phoenix-mesa-scottsdale-ariz') {
        chartElement.append('text').text('Recession')
            .data(recession_dates)
            .attr('class', 'annotation')
            .attr('x', function(d) {
                var box = d3.select('g.recession rect').node().getBBox();

                return box['x'] + (box['width'] / 2);
            })
            .attr('y', 12)
            .attr('text-anchor', 'middle');
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
