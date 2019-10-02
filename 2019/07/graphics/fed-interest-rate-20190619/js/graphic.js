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
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                if (d[key].indexOf('-') !== -1) { // if data is a range...
                    d[key] = [+d[key].split('-')[0], +d[key].split('-')[1]]
                } else {
                    d[key] = +d[key];
                }
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
                    'amt': Array.isArray(d[column]) ? d[column][1] : d[column],
                    'range_min': Array.isArray(d[column]) ? d[column][0] : null
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
    // These are configs
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
    var dateColumn = 'date',
        valueColumn = 'amt',
        minColumn = 'range_min';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 80,
        bottom: 20,
        left: 30
    };

    var ticksX = 15;
    var ticksY = 5;
    var roundTicksFactor = 1;

    var labelLineHeight = 15;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 70;
        labelLineHeight = 13;
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

    var mins = [];
    var maxes = [];

    config['data'].forEach(function(chair) {
        mins.push(d3.min(chair['values'], function(d) { return d['date'] }));
        maxes.push(d3.max(chair['values'], function(d) { return d['date'] }));
    });

    var xScale = d3.time.scale()
        .domain([d3.min(mins), d3.max(maxes)])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([0, 6])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['blue2'], COLORS['yellow2']]);

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
        .tickFormat(function(d,i) {
            if (d === 0) {
                return d;
            } else {
                return d + '%';
            }
        })
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
     * Render area showing recession
     */
    var highlightX1 = xScale(d3.time.format('%m/%d/%y').parse('12/1/07')),
        highlightX2 = xScale(d3.time.format('%m/%d/%y').parse('6/30/09'));

    var highlightG = chartElement.append('g')
        .attr('class', 'highlight-g')
        .attr('transform', 'translate(' + highlightX1 + ', 0)');

    highlightG.append('rect')
        .attr('class', 'highlight-area')
        .attr('height', chartHeight)
        .attr('width', highlightX2 - highlightX1);

    /*
     * Render recession labels
     */
    var highlightTextG = highlightG.append('g')
        .attr('transform', 'translate(' + ((highlightX2-highlightX1)/2) + ', 15)')

    highlightTextG.append('text')
        .attr('class', 'highlight-text')
        .text('Recession');

    /*
     * Render lines to chart.
     */
    var valueline = d3.svg.line()
        .interpolate('step-after')
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
                return valueline(d['values']);
            });

    /*
     * Render ranges
     */

    var range_data = [];

    config['data'].forEach(function(chair) {
        range_data.push({
            'name' : chair['name'],
            'values' : chair['values'].filter(function(d) {
                    return d[minColumn] != null;
                })
            })
    });

    var area = d3.svg.area()
        .interpolate('step-after')
        .x(function(d) { return xScale(d[dateColumn]); })
        .y0(function(d) { return yScale(d[minColumn]); })
        .y1(function(d) { return yScale(d[valueColumn]); });

    range_data.forEach(function(chair) {
        chartElement.append("path")
        .datum(chair['values'])
        .attr("class", "area")
        .attr("d", area)
        .attr('fill', colorScale(chair['name']))
        .attr('fill-opacity', '.5');
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
                var min = last[minColumn]
                // if the min or max value is a whole number, copyedit will ask for there NOT to be decimals.
                // adjust `.toFixed()` accordingly.`
                // var label = getAPMonth(last[dateColumn]) + ' ' + fmtYearFull(last[dateColumn]) + ': ' +  min.toFixed(2) + "% to " + value.toFixed(2) + '%';
                var label = getAPMonth(last[dateColumn]) + ' ' + fmtYearFull(last[dateColumn]) + ': ' +  min.toFixed(0) + "% to " + value.toFixed(2) + '%';

                return label;
            })
            .call(wrapText, margins['right'] - 5, labelLineHeight);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
