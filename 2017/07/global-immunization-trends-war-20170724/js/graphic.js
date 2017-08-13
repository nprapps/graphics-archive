// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

var conflict_dates = [{
    'south-sudan': '2013-12-01',
    'ukraine': '2013-11-01',
    'chad': '2005-12-01',
    'syria': '2011-03-01',
    'nigeria': '2009-07-01',
    'central-african-republic': '2012-12-01'
}];

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

    conflict_dates.forEach(function(d) {
        d['south-sudan'] = d3.time.format('%Y-%m-%d').parse(d['south-sudan']);
        d['ukraine'] = d3.time.format('%Y-%m-%d').parse(d['ukraine']);
        d['chad'] = d3.time.format('%Y-%m-%d').parse(d['chad']);
        d['syria'] = d3.time.format('%Y-%m-%d').parse(d['syria']);
        d['nigeria'] = d3.time.format('%Y-%m-%d').parse(d['nigeria']);
        d['central-african-republic'] = d3.time.format('%Y-%m-%d').parse(d['central-african-republic']);
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

    var graphicWidth = null;
    var gutterWidth = 22;
    var numCols = null;
    var labelWidth = 30;
    var labelGap = 6;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 2;
        labelWidth = 5;
    } else {
        isMobile = false;
        numCols = 3;
    }

    var containerElement = d3.select('#chart-wrapper');
    containerElement.html('');

    // Render the chart!
    dataSeries.forEach(function(d, i) {
        var thisChartSlug = classify(d['name']);
        graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1)) - 10) / numCols);
        var showLabels = false;
        if (i % numCols == 0) {
            graphicWidth += labelWidth + labelGap;
            showLabels = true;
        }

        var thisChartConflict = eval(conflict_dates[0][thisChartSlug]);
        
        var thisChart = containerElement.append('div')
            .attr('id', 'chart-' + thisChartSlug)
            .attr('class', 'chart chart-' + i)
            .attr('style', 'width: ' + graphicWidth + 'px;');

        renderLineChart({
            container: '#chart-' + thisChartSlug,
            slug: thisChartSlug,
            width: graphicWidth,
            showLabels: showLabels,
            data: [d],
            xdomain: [ d3.time.format('%Y').parse('1986'), d3.time.format('%Y').parse('2016') ],
            conflictDates: conflict_dates,
            conflictStart: thisChartConflict
        })
    })

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

    var aspectWidth = isMobile ? 5 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 40,
        bottom: 20,
        left: 28
    };

    if (!config['showLabels']) {
        margins['left'] = 10;
    }

    var ticksX = 12;
    var ticksY = 3;
    var roundTicksFactor = 5;
    var xTickValues = [ d3.time.format('%Y').parse('1986'), d3.time.format('%Y').parse('1996'), d3.time.format('%Y').parse('2006'), d3.time.format('%Y').parse('2016') ];

    var formatComma = d3.format(',');

    // Mobile
    if (isMobile) {
        ticksX = 6;
        ticksY = 3;
        margins['right'] = 25;
        margins['top'] = 10;
    }

    if (isMobile && config['showLabels']) {
        margins['left'] = 28;
    }

    if (config['slug'] == 'south-sudan' || 'ukraine') {
        margins['top'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = null;

    if (isMobile) {
        chartHeight = 102;
        // chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    } else {
        chartHeight = 124;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3').text(config['data'][0]['name']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['xdomain']))
        // .domain(d3.extent(config['data'][0]['values'], function(d) {
        //     return d['date'];
        // }))
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
        .domain([min, 100])
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
     * Define textures
     */
    var textureProjected = textures.lines()
        .size(4)
        .strokeWidth(1)
        .stroke(COLORS['orange5']);

    chartWrapper.select('svg')
        .call(textureProjected);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(xTickValues)
        .tickFormat(function(d, i) {
            if (chartWidth < 110) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            return d;
        });

    // bg shading
    chartElement.append('rect')
        .attr('class', 'conflict')
        .attr('x', xScale(config['conflictStart']))
        .attr('width', chartWidth - xScale(config['conflictStart']))
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

    if (config['showLabels']) {
        chartElement.append('g')
            .attr('class', 'y axis')
            .call(yAxis);
    }

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

    var conflict = chartElement.append('g')
        .attr('class', 'conflict')
        .selectAll('rect')
        .data(config['conflictDates'])
        .enter()
            .append('rect')
                .attr('x', function(d) {
                    return xScale(config['conflictStart']);
                })
                .attr('width', function(d) {
                    return 1;
                })
                .attr('y', 0)
                .attr('height', chartHeight)
                .attr('fill', COLORS['orange3']);

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
                return COLORS['teal2'];
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    var chartLabels = chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter();
    chartLabels.append('text')
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
                var label = last[valueColumn].toFixed(0);

                var firstVal = d['values'][0]['amt'];
                var lastVal = d['values'][d['values'].length - 1]['amt'];
                var changeVal = Math.floor(((lastVal - firstVal) / firstVal) * 100);
                var percChange = null;

                if (changeVal < 0) {
                    percChange = changeVal;
                } else {
                    percChange = '+' + changeVal;
                }

                return label + '%';
            });

    if (config['slug'] == 'south-sudan') {
        var chartLabel = chartElement.append('text')
            .classed('chart-label', true)
            .attr('x', function(){
                return xScale(config['conflictStart']);
            })
            .attr('y', -4)
            .text('Conflict');

        chartLabel.call(wrapText, 60, 13)
    }


}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
