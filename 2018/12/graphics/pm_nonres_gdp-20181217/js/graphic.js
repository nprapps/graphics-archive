// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var annotations = [];
var skipLabels = [ 'date', 'annotate', 'x_offset', 'y_offset', 'text', 'color' ];

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
            if (!_.contains(skipLabels, key) && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }

        if (d['annotate'] == 'yes') {
            annotations.push(d);
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
        if (_.contains(skipLabels, column)) {
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
        right: 40,
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
        margins['right'] = 10;
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

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['teal5'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

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
                .attr('fill', '#ebebeb');

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

    var pre2018 = [];
    var post2018 = [];

    config.data.forEach(function(series) {
        var boundary = new Date(2018, 0, 1);
        var pre = series.values.filter(function(d) {
            return d.date < boundary;
        });
        var post = series.values.filter(function(d) {
            return d.date >= boundary;
        });
        var last = pre[pre.length - 1];
        post.unshift(last);
        pre2018.push({
            name: series.name,
            values: pre
        });
        post2018.push({
            name: series.name,
            values: post
        });
    });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(pre2018)
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', COLORS.teal4)
            .attr('d', function(d) {
                return line(d['values']);
            });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(post2018)
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', COLORS.teal2)
            .attr('d', function(d) {
                return line(d['values']);
            });

    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('text')
        .data(annotations)
        .enter().append('line')
            .attr('x1', function(d, i) {
                return xScale(d['date']);
            })
            .attr('x2', function(d, i) {
                return xScale(d['date']);
            })
            .attr('y1', 0)
            .attr('y2', chartHeight)
            .attr('stroke', function(d) {
                if (d.color in COLORS) {
                    return COLORS[d.color];
                }
                return d.color;
            })

    var wrapText = function(container, text, width) {
        var makeSpan = function() {
            return container.append("tspan")
                .attr("x", 0)
                .attr("y", 0)
                .attr("dx", 0)
                .attr("dy", 0)
                .attr("text-anchor", "end");
        };
        var words = text.split(/\s/g);
        container = d3.select(container);
        var span = makeSpan();
        var cut = 0;
        var line = 0;
        for (var i = 0; i <= words.length; i++) {
            span.text(words.slice(cut, i).join(" "));
            var w = span.node().getComputedTextLength();
            if (w > width) {
                i--;
                span.text(words.slice(cut, i).join(" "));
                cut = i;
                span = makeSpan();
                line++;
                span.attr("dy", line * 17);
                span.text(words.slice(cut));
            }
        }
    };


    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(annotations)
        .enter().append('text')
            .attr('transform', function(d) {
                var x = xScale(d['date']) + Number(d.x_offset);
                var y = 17 + Number(d.y_offset);
                return "translate(" + x + ", " + y + ")";
            })
            .attr('text-anchor', 'end')
            // .text(function(d) {
            //     return d['text'];;
            // })
            .each(function(d) {
                wrapText(this, d.text, 100);
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
