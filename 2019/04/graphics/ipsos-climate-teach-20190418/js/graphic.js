// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values', 'total' ];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });

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
        var y0 = 0;

        d['values'] = [];
        d['total'] = 0;

        for (var key in d) {
            if (skipLabels.indexOf(key) > -1) {
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
    var labelColumn = 'label';

    var aspectWidth = 1;
    var aspectHeight = 1;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 38
    };
    var maxHeight = 350;

    var ticksY = 5;
    var roundTicksFactor = 100;

    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = maxHeight;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(config['data'].map(function(d) { return d[labelColumn] }))
        .rangeRoundBands([0, chartWidth], .1)

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = 100;

    var yScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        // .range([ '#bbb', '#678e6f', '#ffe874', '#ed823a' ]);
        .range([ '#ed823a', '#fac22d', '#678e6f', '#bbb' ]);

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
  		.attr('class', 'key')
  		.selectAll('g')
  			.data(colorScale.domain())
  		.enter().append('li')
  			.attr('class', function(d, i) {
  				return 'key-item key-' + i + ' ' + classify(d);
  			});

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
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
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d) {
          var val = d;
          if (isMobile && d == 'Democrats') {
            val = 'Dem.'
          }
          if (isMobile && d == 'Republicans') {
            val = 'GOP'
          }
          return val;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d + '%';
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
            .style('fill', function(d) {
                return colorScale(d['name']);
            })
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
            .text(function(d) {
                return d['val'] + '%';
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d) {
                return xScale.rangeBand() / 2;
            })
            .attr('y', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));
                var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);

                // if (textHeight + valueGap * 2 > barHeight) {
                if (textHeight > barHeight) {
                    d3.select(this).classed('hidden', true);
                }

                return barCenter + (textHeight / 2) - 2;
            })
            .attr('text-anchor', 'middle');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
