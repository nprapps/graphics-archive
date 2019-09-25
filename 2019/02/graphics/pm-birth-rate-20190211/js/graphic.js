// Global vars
var pymChild = null;
var isMobile = false;
var isNewsletter = false;
var dataSeries = [];

// NBER recession dates: https://www.nber.org/cycles.html
var recession_dates = [
    { 'begin': '1990-07-01', 'end': '1991-03-01' },
    { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (d3.select('body').classed('newsletter')) {
      isNewsletter = true;
    }

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

    recession_dates.forEach(function(d) {
        d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
        d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
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
                    'amt': d[column]                };
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

    if (isNewsletter) {
      containerWidth = 400;
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

    var aspectWidth = isMobile ? 5 : 16;
    var aspectHeight = isMobile ? 4 : 9;

    if (isNewsletter) {
      aspectWidth = 16;
      aspectHeight = 9;
    }

    var margins = {
        top: 32,
        right: 40,
        bottom: 20,
        left: 33
    };

    var ticksX = 10;
    var ticksY = 10;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 6;
        margins.left = 35;
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

    var min0 = isMobile ? -6 : -5;
    var max0 = isMobile ? 6 : 5;

    var min1 = -20;
    var max1 = 20;

    var yScale0 = d3.scale.linear()
        .domain([ min0, max0 ])
        .range([chartHeight, 0]);

    var yScale1 = d3.scale.linear()
        .domain([ min1, max1 ])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([ COLORS['blue4'], COLORS['orange3'] ]);

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
            return '\u2019' + fmtYearAbbrev(d);
        });

    var yAxis0 = d3.svg.axis()
        .scale(yScale0)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function (d) {
          if (d > 0) {
            return '+' + d + '%'
          } else {
            return d + '%';
          }
        });

    var yAxis1 = d3.svg.axis()
        .scale(yScale1)
        .orient('right')
        .ticks(ticksY)
        .tickFormat(function(d) {
          if (d > 0) {
            return '+' + d + '%'
          } else {
            return d + '%';
          }
        });

    /*
     * Render axes to chart.
     */
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
                .attr('fill', '#ebebeb');

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .attr('id', 'conceptions')
        .call(yAxis0);

    chartElement.append('g')
        .attr('class', 'y axis')
        .attr('id', 'durables')
        .attr('transform', makeTranslate(chartWidth, 0))
        .call(yAxis1);


    /*
     * Render axis labels to chart
     */
     chartElement.append('text')
        .attr('class', 'y1-text')
        .attr('text-anchor', 'middle')
        .attr('transform', makeTranslate((chartWidth + margins['right']), -23))
        .text(LABELS['hed_durables']);

    chartElement.append('text')
        .attr('class', 'y0-text')
        .attr('text-anchor', 'middle')
        .attr('transform', makeTranslate(-margins['left'], -23))
        .text(LABELS['hed_conceptions']);

    /*
     * Render 0 value line.
     */
    if (min0 < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale0(0))
            .attr('y2', yScale0(0));
    }

    /*
     * Render lines to chart.
     */
    var line0 = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale0(d[valueColumn]);
        });

    var line1 = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale1(d[valueColumn]);
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
            .attr('d', function(d, i) {
              if (i == 0) {
                return line0(d['values']);
              } else {
                return line1(d['values']);
              }
            });

    chartElement.select('path.conceptions').moveToFront();

    chartElement.append('g')
        .attr('class', 'value')
        .attr('id', 'unemployment')
        .selectAll('text')
        .data([config['data'][1]])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale1(last[valueColumn]) + 3;
            });
}

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
