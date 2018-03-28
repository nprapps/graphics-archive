// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = {};

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
    var counties = Object.keys(DATA);

    counties.forEach(function(c) {
        var data = DATA[c];

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

        dataSeries[c] = []

        for (var column in data[0]) {
            if (column == 'date') {
                continue;
            }

            dataSeries[c].push({
                'name': column,
                'values': data.map(function(d) {
                    return {
                        'date': d['date'],
                        'amt': d[column]
                    };
                })
            });
        }
    });
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
    // renderLineChart({
    //     container: '#line-chart',
    //     width: containerWidth,
    //     data: dataSeries
    // });

    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
        .data(dataSeries['Harris (Houston)'])
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item ' + classify(d['name']);
            });

    legend.append('b');

    legend.append('label')
        .text(function(d) {
            return d['name'];
        });

    var counties = Object.keys(DATA);

    counties.forEach(function(val, i) {
        var countyChart = containerElement.append('div')
            .attr('id', 'line-chart-' + i)
            .attr('class', 'chart-wrapper grid-' + i%4);

        // Render the chart!
        var labelWidth = 22,
            grid_columns = 4,
            chartWidth = (containerWidth  - labelWidth ) / grid_columns;

        countyChart.style('width', isMobile ? containerWidth + 'px' : i%4 === 0 ? (chartWidth + labelWidth) + 'px' : chartWidth + 'px');

        renderLineChart({
            chartIndex: i,
            hed: val,
            container: '#line-chart-' + i,
            labelWidth: isMobile || i%4 === 0 ? labelWidth : 0,
            width: isMobile ? containerWidth : i%4 === 0 ? (chartWidth + labelWidth) : chartWidth,
            gridWidth: isMobile ? containerWidth : chartWidth,
            // max: 80,
            data: dataSeries[val]
        });
    });

    // Set consistent h3 heights
    var labelHeds = d3.selectAll('h3');
    var labelMaxHeight = 0;

    labelHeds[0].forEach(function(d,i) {
        var thisHeight = d.getBoundingClientRect().height;
        if (thisHeight > labelMaxHeight) {
            labelMaxHeight = thisHeight;
        }
    });

    labelHeds.style('height', labelMaxHeight + 'px');

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
    var formatNumber = d3.format("0,000");
    var formatDecimal = d3.format(".3s");
    var formatThousand = function(x) { return formatNumber(x / 1e3) + "k"; };
    var formatThousandDecimal = function(x) {return formatDecimal(x / 1e3) + "k"; };

    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = 4;
    var aspectHeight = 3.5;

    var margins = {
        top: 5,
        right: 50,
        bottom: 20,
        left: config['labelWidth'] + 13
    };

    var ticksX = 3;
    var ticksY = 4;
    var roundTicksFactor = 50000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['gridWidth'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['hed'])
        .style('padding-left', margins.left + 'px');

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
        .domain([0, 150000])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['red3'], COLORS['blue2']]);

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
            if (fmtYearFull(d) % 2 === 0) {
                return '\u2019' + fmtYearAbbrev(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d === 0) {
                return d;
            } else {
                return formatThousand(d);
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

    var valueLabels = chartElement.append('g')
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

                var label = formatThousandDecimal(last[valueColumn].toFixed(0));

                return label;
            })
            .attr('fill', function(d) {
                if (d["name"] === 'Democrat') {
                    return COLORS['blue2'];
                } else if (d["name"] === 'Republican') {
                    return COLORS['red3'];
                }
            });

    adjustLabelPositions(valueLabels);

    function adjustLabelPositions(selection) {
        var reasonableLineHeight = 14;

        var label0 = d3.select(selection[0][0]),
            label1 = d3.select(selection[0][1]);

        var yPos_label0 = +label0.attr('y'),
            yPos_label1 = +label1.attr('y');

        var yDiff = yPos_label0 - yPos_label1;

        // If labels are too close together
        if (Math.abs(yDiff) < reasonableLineHeight) {
            var labelOffset = (reasonableLineHeight - Math.abs(yDiff)) / 2;
            // if first label is on top
            if (yDiff < 0) {
                label0.attr('y', yPos_label0 - labelOffset);
                label1.attr('y', yPos_label1 + labelOffset);
            } else {
                // if first label is on bottom
                label0.attr('y', yPos_label0 + labelOffset);
                label1.attr('y', yPos_label1 - labelOffset);
            }
        }
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
