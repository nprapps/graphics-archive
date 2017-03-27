// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

var TOTAL_CAPACITY = 3537577;

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
    ANNOTATIONS.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d').parse(d['date']);
        d['value'] = +d['value'];
    });

    DATA.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d').parse(d['date']);

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
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 10,
        right: 5,
        bottom: 20,
        left: 60
    };

    var ticksX = 12;
    var ticksY = 10;
    var roundTicksFactor = 1000000;
    var numYears = config['data'].length;

    // Mobile
    if (isMobile) {
        ticksY = 5;
        margins['left'] = 26;
        margins['right'] = 5;
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

    var yScale = d3.scale.linear()
        .domain([min, max])
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
        .tickFormat(function(d, i) {
            if (!isMobile || (isMobile && (i % 2 == 0))) {
                return getAPMonth(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            } else {
                var val = d / 1000000;
                if (isMobile) {
                    return val.toFixed(0) + 'M';
                } else {
                    return val.toFixed(1) + ' million';
                }
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
                return 'line y-' + classify(d['name']);
            })
            // .attr('style', function(d, i) {
            //     if (i != (numYears - 1)) {
            //         var thisYear = i + 1;
            //         var thisOpacity = 1 * (thisYear / numYears);
            //         // console.log(d, i, thisOpacity.toFixed(2));
            //         return 'stroke-opacity: ' + thisOpacity.toFixed(2);
            //     }
            // })
            .attr('d', function(d) {
                return line(d['values']);
            });

    // annotations
    var annot = chartElement.append('g')
        .attr('class', 'annotations');

    annot.append('line')
        .attr('class', 'capacity')
        .attr('x1', xScale(xScale.domain()[0]))
        .attr('x2', xScale(xScale.domain()[1]))
        .attr('y1', yScale(TOTAL_CAPACITY))
        .attr('y2', yScale(TOTAL_CAPACITY));

    annot.append('text')
        .attr('class', 'capacity')
        .attr('x', chartWidth)
        .attr('y', yScale(TOTAL_CAPACITY))
        .attr('dy', -8)
        .text('Capacity: ' + fmtComma(TOTAL_CAPACITY) + ' acre feet');

    _.each(ANNOTATIONS, function(d,i) {
        annot.append('circle')
            .attr('cx', xScale(d['date']))
            .attr('cy', yScale(d['value']))
            .attr('r', 3);

        var dx = 0;
        var dy = 3;
        switch(d['align']) {
            case 'middle':
                dy = -20;
                break;
            case 'start':
                dx = 8;
                break;
        }

        annot.append('text')
            .text(d['label'] + ' ' + fmtComma(d['value']))
            .attr('x', xScale(d['date']) + dx)
            .attr('y', yScale(d['value']) + dy)
            .attr('text-anchor', d['align'])
            .call(wrapText, 75, 12);
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
