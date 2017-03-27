// Global vars
var pymChild = null;
var isMobile = false;
var housingDataSeries = [];
var stocksDataSeries = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData(HOUSING_DATA, housingDataSeries);
        formatData(STOCKS_DATA, stocksDataSeries);

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

    var containerElement = d3.select('#chart-wrapper');
    containerElement.html('');

    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'housing-chart')
        .attr('style', 'width: ' + graphicWidth + 'px;');

    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'stocks-chart')
        .attr('style', 'width: ' + graphicWidth + 'px;');

    var tickValues = [
        d3.time.format('%m/%d/%Y').parse('01/01/2014'),
        d3.time.format('%m/%d/%Y').parse('07/01/2014'),
        d3.time.format('%m/%d/%Y').parse('01/01/2015'),
        d3.time.format('%m/%d/%Y').parse('07/01/2015'),
        d3.time.format('%m/%d/%Y').parse('01/01/2016')
    ];

    // Render the chart!
    renderLineChart({
        id: 'housing',
        container: '#housing-chart',
        width: graphicWidth,
        roundTicksFactor: 20,
        ticksY: 6,
        chartLabel: 'Year over year change in property&nbsp;prices',
        unit: '%',
        data: housingDataSeries,
        tickValues: tickValues,
        showValueLabel: true,
        colorScale: [ COLORS['orange5'], COLORS['orange3'] ]
    });

    renderLineChart({
        id: 'stocks',
        container: '#stocks-chart',
        width: graphicWidth,
        roundTicksFactor: 1000,
        ticksY: 6,
        chartLabel: 'Shanghai Stock Exchange Composite Index (in&nbsp;CNY)',
        data: stocksDataSeries,
        tickValues: tickValues,
        showValueLabel: false,
        colorScale: [ COLORS['red3'] ]
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

    var aspectWidth = 5;
    var aspectHeight = 3;

    var margins = {
        top: 5,
        right: 75,
        bottom: 20,
        left: 40
    };

    var ticksY = config['ticksY'];
    var roundTicksFactor = config['roundTicksFactor'];

    // // Mobile
    // if (isMobile) {
    //     ticksX = 5;
    //     ticksY = 5;
    //     margins['right'] = 25;
    // }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .html(config['chartLabel']);

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
        .range(config['colorScale']);

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
        .tickValues(config['tickValues'])
        .tickFormat(function(d, i) {
            var fmtDateMonth = d3.time.format('%b');
            var m = fmtDateMonth(d);
            switch(m) {
                case 'Jan':
                    m = 'Jan.'
                    break;
                case 'Jul':
                    m = 'July'
                    break;
            }
            return m + ' \u2019' + fmtYearAbbrev(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (config['unit'] && d !== 0) {
                return fmtComma(d) + config['unit'];
            } else {
                return fmtComma(d);
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

    //if (config['container'] == '#housing-chart') {
        //chartElement.append('line')
            //.attr('class', 'x-baseline')
            //.attr('', chartWidth)
    //}

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    chartElement.selectAll('.y.grid .tick')
        .filter(function(d) { return d===0; })
        .classed('baseline-0', true);

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

    var lineValues = chartElement.append('g')
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
            .attr('dx', 0)
            .attr('dy', 0)
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = null;

                switch(config['id']) {
                    case 'housing':
                        label = d['name'] + ': +' + last[valueColumn].toFixed(1) + '%';
                        break;
                    case 'stocks':
                        label = fmtComma(last[valueColumn].toFixed(1));
                        break;
                }

                return label;
            });

    if (config['id'] == 'housing') {
        lineValues.call(wrapText, (margins['right'] - 6), 16);
    }
}

/*
 * Wrap a block of text to a given width
 * via http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = parseFloat(text.attr('dx'));
        var dy = parseFloat(text.attr('dy'));

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
