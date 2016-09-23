// Global vars
var pymChild = null;
var isMobile = false;

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
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
  for (var country in DATA) {
    DATA[country].forEach(function(d) {
        var y0 = 0;

        d['values'] = [];
        d['total'] = 0;
        d['label'] = d3.time.format('%Y').parse(d['label']);

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'total') {
                continue;
            }

            d[key] = +d[key];

            var y1 = y0 + d[key];
            d['total'] += d[key];

            d['values'].push({
                'name': key,
                'y0': y0,
                'y1': y1,
                'val': d[key]
            })

            y0 = y1;
        }
    });
  }
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    // if (!containerWidth) {
    //     containerWidth = DEFAULT_WIDTH;
    // }
    //
    // if (containerWidth <= MOBILE_THRESHOLD) {
    //     isMobile = true;
    // } else {
    //     isMobile = false;
    // }
    if (!containerWidth) {
    containerWidth = DEFAULT_WIDTH;
    }
    var graphicWidth = containerWidth;
    // var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        // graphicWidth = containerWidth;
    } else {
        isMobile = false;
        // graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }


    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#stacked-column-chart');
    containerElement.html('');

    // Render the chart!
    var charts = d3.keys(DATA);
    charts.forEach(function(d,i) {
        var chartElement = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        // chartElement.append('h3')
        //     .html(HEADERS[d]);

        renderStackedColumnChart({
            container: '.chart.' + classify(d),
            width: graphicWidth,
            data: DATA[d],
            dataColumn: d,
            domain: [ 0, 30 ]
        });
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
    var labelColumn = 'label';

    var aspectWidth = 16;
    var aspectHeight = 4;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 31
    };

    var ticksY = 4;
    var roundTicksFactor = 10;

    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 1;
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
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .rangeRoundBands([0, chartWidth], .1)

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([0, 31])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            return d != labelColumn && d != 'values' && d != 'total';
        }))
        .range([ COLORS['teal2'], COLORS['teal3'], COLORS['teal5']]);

    /*
     * Render the legend.
     */
    // var legend = containerElement.append('ul')
		// .attr('class', 'key')
		// .selectAll('g')
		// 	.data(colorScale.domain())
		// .enter().append('li')
		// 	.attr('class', function(d, i) {
		// 		return 'key-item key-' + i + ' ' + classify(d);
		// 	});
    //
    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return colorScale(d);
    //     });
    //
    // legend.append('label')
    //     .text(function(d) {
    //         return d;
    //     });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
          .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues([
          d3.time.format('%Y').parse('1912'),
          d3.time.format('%Y').parse('1984'),
          d3.time.format('%Y').parse('2000'),
          d3.time.format('%Y').parse('2012') ]) //-> why does that not work?
        .tickFormat(function(d) {
            return fmtYearFull(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d +'%';
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
    var bars = chartElement.selectAll('.bars')
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
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            // .style('fill', function(d) {
            //     return colorScale(d['name']);
            // })
            .attr('class', function(d) {
                return classify(d['name']);
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
     * Render values to chart.
     */
    bars.selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('text')
            // .text(function(d) {
            //     return d['val'];
            // })
            .attr('class', function(d) {
                return classify(d['name']);
                // return 'value-' + fmtYearFull(d[labelColumn]);
            })
            .attr('x', function(d) {
                return xScale.rangeBand() / 2;
            })
            .attr('y', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));

                if (textHeight + valueGap * 2 > barHeight) {
                    d3.select(this).classed('hidden', true);
                }

                var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);

                return barCenter + textHeight / 2;
            })
            .attr('text-anchor', 'middle');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
