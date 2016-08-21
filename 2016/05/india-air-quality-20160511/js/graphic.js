// Global vars
var pymChild = null;
var isMobile = false;

var x_ticks = [];

/*
 * Initialize the graphic.
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
        d['values'] = [];
        d['total'] = d['max'] - d['min'];

        if (d['date'].getDate() === 1 || d['date'].getDate() === 15) {
            x_ticks.push(d['date']);
        }

        // Air quality thresholds
        var thresholds = [50, 100, 150, 200, 300, 9999];
        var th_labels = ['Good', 'Moderate', 'Unhealthy for sensitive groups', 'Unhealthy', 'Very unhealthy', 'Hazardous'];
        var lower = parseFloat(d['min']);

        for (var i=0; i<thresholds.length; i++) {
            var th = thresholds[i];
            var y0 = lower;
            var min = parseFloat(d['min']);
            var max = parseFloat(d['max']);

            if (isNaN(min)) {
                y0 = 0;
                y1 = 0;
                lower = 0;
            } else if (th < min) {
                y1 = min;
                lower = min;
            } else if (th < max) {
                y1 = th;
                lower = th;
            } else {
                y1 = max;
                lower = max;
            }

            d['values'].push({
                'name': th_labels[i],
                'y0': y0,
                'y1': y1,
                'val': y1 - y0,
                'avg': !isNaN(d['avg']) ? d['avg'] : null
            })
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
    renderStackedColumnChart({
        container: '#stacked-column-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked column chart.
 */
var renderStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'date';

    var aspectWidth = 16;
    var aspectHeight = 9;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 80,
        bottom: 20,
        left: 30
    };

    var ticksY = 5;
    var roundTicksFactor = 100;

    if (isMobile) {
        margins['left'] = 26;
        aspectWidth = 4;
        aspectHeight = 3;
    }

    // Calculate actual chart dimensions
    var chartWidth = Math.floor((config['width'] - margins['left'] - margins['right']) / (config['data'].length + 1)) * (config['data'].length + 1);
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    if (chartHeight > 600) {
        chartHeight = 600;
    }

    if (isMobile && chartWidth < 205) {
        margins['right'] = 70;
        chartWidth = 205;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ]);

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d['min'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d['max'] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([chartHeight, 0]);

    console.log(config['data']);
    var colorScale = d3.scale.ordinal()
        .domain(config['data'][0]['values'].map(function(d) { return d['name']; }))
        .range(['#8bc0b0', '#f7e39b', '#f1c696', '#eca395', '#bb92ab', '#927e99']);

    /*
     * Render the legend.
     */
    var legend_wrap = containerElement.append('div')
        .attr('class', 'legend-wrap');

    legend_wrap.append('h3')
        .html('Air quality levels scaled to <a href="https://airnow.gov/index.cfm?action=aqibasics.aqi">EPA Air Quality&nbsp;Index</a>');

    var legend = legend_wrap.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorScale.domain())
		.enter().append('li')
            //.style('background-color', function(d) {
                //return colorScale(d);
            //})
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b')
        .text(function(d,i) {
            var label_ranges = ['0-50', '51-100', '101-150','151-200','201-300','301-500'];
            return label_ranges[i];
        })
        //.style('background-color', function(d) {
            //return colorScale(d);
        //});

    legend.append('label')
        .text(function(d) {
            return d;
        });

    var highlight_note = legend_wrap.append('div')
        .attr('class', 'highlight-note');

    highlight_note.append('b');
    highlight_note.append('label')
        .text('Driving restrictions in effect');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', config['width'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var chart_x_ticks = x_ticks;
    if (isMobile) {
        chart_x_ticks = [x_ticks[0], x_ticks[2], x_ticks[4], x_ticks[6]];
    }

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(chart_x_ticks)
        .tickFormat(function(d) {
            return formatAPDates(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
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
     * Render highlighted time periods
     */
    var bar_w = Math.floor(chartWidth / config['data'].length) > 2 ? Math.floor(chartWidth / config['data'].length): Math.floor(chartWidth / config['data'].length);
    highlight_g = chartElement.append('g')
        .attr('class', 'highlights');

    var jan_start = d3.time.format('%m/%d/%y').parse('1/1/16'),
        jan_end = d3.time.format('%m/%d/%y').parse('1/15/16'),
        apr_start = d3.time.format('%m/%d/%y').parse('4/15/16'),
        apr_end = d3.time.format('%m/%d/%y').parse('4/30/16');

    highlight_g.append('rect')
        .attr('height', chartHeight)
        .attr('width', xScale(jan_end) - xScale(jan_start))
        .attr('transform', 'translate(0,0)');

    highlight_g.append('rect')
        .attr('height', chartHeight)
        .attr('width', xScale(apr_end) - xScale(apr_start) + bar_w)
        .attr('transform', 'translate(' + xScale(apr_start) + ',0)');

    highlight_g.append('text')
        .attr('class', 'highlight-label label-jan')
        .text('Driving restrictions in effect')
        .attr('x', 4)
        .attr('y', chartHeight - 40)
        .call(wrapText, 62, 11);

    highlight_g.append('text')
        .attr('class', 'highlight-label label-apr')
        .text('Driving restrictions in effect')
        .attr('x', chartWidth - (4 * bar_w))
        .attr('y', 15)
        .call(wrapText, 62, 11);

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
    var bars = chartElement.selectAll('.bar')
        .data(config['data'])
        .enter().append('g')
            .attr('class', 'bar')
            .attr('transform', function(d) {
                return makeTranslate(xScale(d[labelColumn]), 0);
            });

    bars.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })
            .attr('width', bar_w)
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .style('fill', function(d) {
                return colorScale(d['name']);
            })
            .attr('class', function(d) {
                return classify(d['name']);
            });

    // Add daily averages
    var line = d3.svg.line()
        //.interpolate('monotone')
        .interpolate('step-after')
        .defined(function(d) {
            return d['avg'] != null;
        })
        .x(function(d) {
            return xScale(d[labelColumn]);
        })
        .y(function(d) {
            return yScale(d['avg']);
        });

    var line_data = config['data'];

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data([line_data])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line';
            })
            .attr('d', function(d) {
                return line(d);
            });


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
     * Render side labels
     */
    var annos_g = chartElement.append('g')
        .attr('class', 'annos-g');

    var last_item = config['data'][config['data'].length - 1];
    annos_g.append('line')
        .attr('class', 'anno-leader')
        .attr('x1', chartWidth + bar_w + 2)
        .attr('x2', chartWidth + bar_w + 10)
        .attr('y1', yScale(last_item['max']))
        .attr('y2', yScale(last_item['max']))

    annos_g.append('text')
        .attr('class', 'anno-label')
        .attr('x', chartWidth + bar_w + 12)
        .attr('y', yScale(last_item['max']) + 5)
        .text('Daily maximum pollution level')
        .call(wrapText, config['width'] - chartWidth - margins['left'] - 17, 12);

    annos_g.append('line')
        .attr('class', 'anno-leader')
        .attr('x1', chartWidth + bar_w + 2)
        .attr('x2', chartWidth + bar_w + 10)
        .attr('y1', yScale(last_item['min']) - 1)
        .attr('y2', yScale(last_item['min']) - 1)

    annos_g.append('text')
        .attr('class', 'anno-label')
        .attr('x', chartWidth + bar_w + 12)
        .attr('y', yScale(last_item['min']) + 5)
        .text('Daily minimum')
        .call(wrapText, config['width'] - chartWidth - margins['left'] - 15, 12);

    annos_g.append('line')
        .attr('class', 'anno-leader anno-avg')
        .attr('x1', chartWidth + bar_w + 2)
        .attr('x2', chartWidth + bar_w + 10)
        .attr('y1', yScale(last_item['avg']) - 1)
        .attr('y2', yScale(last_item['avg']) - 1)

    annos_g.append('text')
        .attr('class', 'anno-label anno-avg')
        .attr('x', chartWidth + bar_w + 12)
        .attr('y', yScale(last_item['avg']) + 5)
        .text('Daily average')
        .call(wrapText, config['width'] - chartWidth - margins['left'] - 15, 12);
}

var formatAPDates = function(d) {
    var AP_MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

    return AP_MONTHS[d.getMonth()] + ' ' + d.getDate();
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
