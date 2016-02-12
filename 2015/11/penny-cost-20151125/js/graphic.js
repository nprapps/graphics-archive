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
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
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

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    var face_data = {
        'penny': 0.01,
        'nickel': 0.05,
        'dime': 0.1,
        'quarter': 0.25
    };

    var containerElement = d3.select('#graphic');
    containerElement.html('');

    dataSeries.forEach(function(v,k) {
        var chart_id = '#line-chart-' + v['name'].toLowerCase();
        var face_value = face_data[v['name'].toLowerCase()];

        containerElement.append('div')
            .attr('id', 'line-chart-' + v['name'].toLowerCase())
            .attr('class', 'graphic');

        // Render the chart!
        renderLineChart({
            container: chart_id,
            width: isMobile ? containerWidth : containerWidth / 4,
            data: [v],
            face_value: face_value,
            chart_i: k,
            overall_data: dataSeries
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
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 26;

    var margins = {
        top: 5,
        right: 10,
        bottom: 20,
        left: 28
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 0.01;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['overall_data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var min = d3.min(config['overall_data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['overall_data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var yScale = d3.scale.linear()
        .domain([min, 0.25])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['overall_data'], 'name'))
        .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

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
    var data_values = config['data'][0]['values'];
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues([data_values[0]['date'], data_values[data_values.length - 1]['date']])
        .tickFormat(function(d, i) {
            if (i == 1) {
                return 'FY\u2019' + fmtYearAbbrev(d);
            } else {
                return '\u2019' + fmtYearAbbrev(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d,i) {
            return toCents(d) + '\u00A2';
        });

    //textWrap(d3.select('.y.axis').selectAll('text'), 45);

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
        //.interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    var face_line = d3.svg.line()
        //.interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });


    // Render face value line
    chartElement.append('g')
        .attr('class', 'lines lines-face-value')
        .append('line')
            .attr('class', 'line-face')
            .attr('x1', xScale(config['data'][0]['values'][0][dateColumn]))
            .attr('x2', xScale(config['data'][0]['values'][config['data'][0]['values'].length - 1][dateColumn]))
            .attr('y1', yScale(config['face_value']))
            .attr('y2', yScale(config['face_value']));

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

    var label_i = 0;
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][label_i];

                return xScale(last[dateColumn]);
            })
            .attr('y', function(d) {
                var last = d['values'][label_i];
                var offset = config['chart_i'] == 0 ? -18 : 15;

                return yScale(last[valueColumn]) + offset;
            })
            .text(function(d) {
                var last = d['values'][label_i];
                var value = last[valueColumn];

                var label = config['chart_i'] == 0 ? toCents(value, true) : toCents(value);

                return label;
            });

    // Small multiple text/labeling
    var annoWrapper = containerElement.append('div')
        .attr('class', 'chart-anno-wrap');

    annoWrapper.append('h3')
        .text(config['data'][0]['name']);

    var cost_fmt = toCents(config['data'][0]['values'][0]['amt'], true);

    annoWrapper.append('p')
        .attr('class', 'chart-anno')
        .text('Costs ' + cost_fmt + ' to produce');

    var unit_profit = config['face_value'] - config['data'][0]['values'][0]['amt'];
    var unit_text = unit_profit > 0 ? ' below face&nbsp;value)' : ' above face&nbsp;value)';
    var unit_fmt = toCents(Math.abs(unit_profit), true);

    annoWrapper.append('p')
        .attr('class', 'chart-anno')
        .html('(' + unit_fmt + unit_text);
}

function toCents(num, has_unit) {
    var rounded = Math.round(num * 1000) / 10;
    var label = has_unit ? rounded + ' cents' : rounded;
    return label;
}

function textWrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
