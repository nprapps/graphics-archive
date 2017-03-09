// Global vars
var pymChild = null;
var isMobile = false;
var childDataSeries = [];
var adolescentDataSeries = [];
var teenDataSeries = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData(CHILD_DATA, childDataSeries);
        formatData(ADOLESCENT_DATA, adolescentDataSeries);
        formatData(TEEN_DATA, teenDataSeries);

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
var formatData = function(data, dataSeries) {
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
        graphicWidth = Math.floor((containerWidth - (gutterWidth * 2)) / 3);
    }

    var containerElement = d3.select('#chart-wrapper');
    containerElement.html('');

    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'child-chart')
        .attr('style', 'width: ' + graphicWidth + 'px;');
    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'adolescent-chart')
        .attr('style', 'width: ' + graphicWidth + 'px;');
    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'teen-chart')
        .attr('style', 'width: ' + graphicWidth + 'px;');

    // Render the chart!
    renderLineChart({
        container: '#child-chart',
        width: graphicWidth,
        data: childDataSeries,
        chartHead: 'Children'
    });
    renderLineChart({
        container: '#adolescent-chart',
        width: graphicWidth,
        data: adolescentDataSeries,
        chartHead: 'Adolescents'
    });
    renderLineChart({
        container: '#teen-chart',
        width: graphicWidth,
        data: teenDataSeries,
        chartHead: 'Teenagers'
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
    var labelLineHeight = 12;

    var aspectWidth = isMobile ? 4 : 10;
    var aspectHeight = isMobile ? 3 : 12;

    var margins = {
        top: 5,
        right: 80,
        bottom: 20,
        left: 22
    };

    var ticksX = 5;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
        labelLineHeight = 11;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
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

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range(['#ccc', COLORS['teal1'], COLORS['teal3'], COLORS['teal5']]);

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
        .tickFormat(function(d) {
            return '\u2019' + fmtYearAbbrev(d);
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

                if(!isMobile) {
                    if (last.amt == 19) {
                        return yScale(last[valueColumn]) - 8;
                    } else if (last.amt == 17) {
                        return yScale(last[valueColumn]) + 3;
                    } else if (last.amt == 21) {
                        return yScale(last[valueColumn]) - 12;
                    } else if (last.amt == 20) {
                        return yScale(last[valueColumn]) + 4;
                    } else if (last.amt == 24) {
                        return yScale(last[valueColumn]) - 2;
                    } else if (last.amt == 22) {
                        if (d['name'] == 'Age 17 to 18') {
                            return yScale(last[valueColumn]) + 32;
                        } else {
                            return yScale(last[valueColumn]) + 8;
                        }
                    } else {
                        return yScale(last[valueColumn]) - 12;
                    }
                } else if (last.amt == 20) {
                        return yScale(last[valueColumn]) - 4;
                } else {
                    return yScale(last[valueColumn]) - 12;
                }


            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];
                var label = last[valueColumn].toFixed(0) + '%';

                if (!isMobile) {
                    label = d['name'] + ': ' + label;

                    // if (label == 'Age 17 to 18: 22%') {
                    //
                    // }
                }

                return label;
            })
            .call(wrapText, margins['right'] - 5, labelLineHeight);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
