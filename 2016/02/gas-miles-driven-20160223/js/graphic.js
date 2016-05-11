// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var mileageSeries = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData(DATA, dataSeries);
        formatData(MILEAGE, mileageSeries);

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function(data, output) {
    data.forEach(function(d) {
        if (data == DATA) {
            d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);
        } else if (data == MILEAGE) {
            d['date'] = d3.time.format('%Y').parse(d['date']);
        }

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];

                if (data == MILEAGE) {
                    d[key] = d[key] / 1000000;
                }
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

        output.push({
            'name': column,
            'values': data.map(function(d) {
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
    var containerElement = d3.select('.graphic');
    containerElement.html('');

    // Render the chart!
    var gasPricesWrapper = containerElement.append('div')
        .attr('id', 'gas-prices')
        .attr('class', 'chart-wrapper')
        .attr('style', function() {
            if (!isMobile) {
                return 'width: ' + graphicWidth + 'px;';
            }
        });

    gasPricesWrapper.append('h3')
        .text('Weekly average gas prices (2006-present)');

    var gasDomain = [0, d3.max(dataSeries, function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v['amt'] / 1) * 1;
        })
    })];
    renderLineChart({
        container: '#gas-prices',
        width: graphicWidth,
        data: dataSeries,
        domain: gasDomain
    });

    var mileageWrapper = containerElement.append('div')
        .attr('id', 'miles-driven')
        .attr('class', 'chart-wrapper')
        .attr('style', function() {
            if (!isMobile) {
                return 'width: ' + graphicWidth + 'px;';
            }
        });

    mileageWrapper.append('h3')
        .text('Annual miles driven (2006-2015)');

    var mileageDomain = [
        d3.min(mileageSeries, function(d) {
            return d3.min(d['values'], function(v) {
                return Math.floor(v['amt'] / .2) * .2;
            })
        }), d3.max(mileageSeries, function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v['amt'] / .2) * .2;
        })
    })];

    renderLineChart({
        container: '#miles-driven',
        width: graphicWidth,
        data: mileageSeries,
        domain: mileageDomain
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
        right: 65,
        bottom: 20,
        left: 38
    };

    var ticksX = 10;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        margins['right'] = 55;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain(config['domain'])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

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
            // if (isMobile) {
            return '\u2019' + fmtYearAbbrev(d);
            // } else {
            //     return fmtYearFull(d);
            // }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            switch(config['container']) {
                case '#gas-prices':
                    return '$' + d.toFixed(2);
                    break;
                case '#miles-driven':
                    return d.toFixed(1) + 'T';
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

                switch(config['container']) {
                    case '#gas-prices':
                        return '$' + last[valueColumn].toFixed(2);
                        break;
                    case '#miles-driven':
                        return last[valueColumn].toFixed(1) + ' trillion';
                        break;
                }
            });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
