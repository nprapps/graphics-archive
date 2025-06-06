// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

var recession_dates = [
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
];

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
        recession_dates.forEach(function(d) {
       d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
       d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
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
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 115,
        bottom: 20,
        left: 30
    };

    var ticksX = 10;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 75;
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

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var rawMax = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return v[valueColumn];
        })
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['teal3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

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

    var recession = chartElement.append('g')
        .attr('class', 'recession')
        .selectAll('rect')
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
                .attr('fill', '#f2f2f2');

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
    // if (min < 0) {
    //     chartElement.append('line')
    //         .attr('class', 'zero-line')
    //         .attr('x1', 0)
    //         .attr('x2', chartWidth)
    //         .attr('y1', yScale(0))
    //         .attr('y2', yScale(0));
    // }

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

    // Find most recent point with maximum value
    var maxPoint = config['data'][0]['values'].filter(function(v) {
            return v[valueColumn] == rawMax;
        }).slice(-1);
    var lastPoint = config['data'][0]['values'].slice(-1);
    var pointArray = maxPoint.concat(lastPoint);

    var valueGroup = chartElement.append('g')
        .attr('class', 'value');

    valueGroup.selectAll('circle')
            .data(pointArray)
        .enter().append('circle')
            .attr('cx', function(d,i) {
                return xScale(d[dateColumn]);
            })
            .attr('cy', function(d,i) {
                return yScale(d[valueColumn]);
            })
            .attr('r', 4);

    var labelLineHeight = isMobile ? 10 : 14;
    valueGroup.selectAll('text')
            .data(pointArray)
        .enter().append('text')
            .attr('x', function(d,i) {
                return xScale(d[dateColumn]) + 5;
            })
            .attr('y', function(d,i) {
                var valueGap = isMobile ? 10 : 6;
                return yScale(d[valueColumn]) + valueGap;
            })
            .text(function(d,i) {
                var monthLabel = getAPMonth(d[dateColumn]);
                var yearLabel = +d3.time.format('%Y')(d[dateColumn]);
                var prevYearLabel = yearLabel - 1;
                var valueLabel = d[valueColumn].toFixed(1);
                return monthLabel + ' ' + yearLabel + ': +' + valueLabel + '% from ' + monthLabel + ' ' + prevYearLabel;
            })
            .call(wrapText, margins['right'] - 5, labelLineHeight);

    // Align labels to bottom of point
    valueGroup.selectAll('text')
        .attr('transform', function(d) {
            var textHeight = this.getBBox().height;
            return 'translate(0, -' + textHeight + ')';
        });

        chartElement.append('text')
            .classed('chart-label', true)
            .attr('x', function(){
                var dates = recession_dates[0];
                return xScale(dates['begin']) + ((xScale(dates['end']) - xScale(dates['begin'])) / 2);
            })
            .attr('y', 15)
            .text('Recession');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
