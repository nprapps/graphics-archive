// Global vars
var pymChild = null;
var isMobile = false;

var barClass = function (d, i) {
  return 'bar-' + i + ' ' + classify(d['bar_slug']);
};

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    // Since we'll have multiple charts in this graphic, define their configs
    // in an array so we can iterate over them when rendering charts.
    //
    // These configs should have properties that can be passed as the config
    // object to `renderBarChart()`.
    //
    // We'll hold off on populating this for now because this won't be
    // relevant if we're just using the fallback image.
    var chartConfigs;
    var formattedData;
    // The maximum value of the x axis ticks.
    var xScaleMax;

    if (Modernizr.svg) {
        // Convert values to numeric types
        formattedData = formatData(DATA);
        // Calculate the maximum value for our x scale. We do this so we can
        // have the same scale for both of the charts.
        xScaleMax = roundValueForTick(
          Math.ceil,
          // Round to the nearest 10, otherwise the final (rightmost) tick
          // won't be shown.
          10,
          // We want the maximum of both data sets
          d3.max(formattedData, function(d) {
            return d['amt'];
          })
        );
        chartConfigs = [
            {
                data: formattedData.filter(function(d) {
                  return d['chart_slug'] === 'students';
                }),
                header: LABELS["subplot_1_hed"],
                xScaleMax: xScaleMax,
                barClass: barClass
            },
            {
                data: formattedData.filter(function(d) {
                  return d['chart_slug'] === 'students-arrested';
                }),
                header: LABELS["subplot_2_hed"],
                xScaleMax: xScaleMax,
                barClass: barClass
            }
        ];

        pymChild = new pym.Child({
            renderCallback: render.bind(null, chartConfigs)
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
 * Format data for D3.
 *
 * I updated the version from the default version to return a transformed
 * data array instead of modifying `DATA` in place.
 */
var formatData = function(data) {
  return data.map(function(d) {
    return _.extend({}, d, {
        // Convert numers as strings to real numbers.  This method is kind of
        // neat because it works for either integers or floats and doesn't
        // complain if the value is already numeric.
        'amt': +d['amt']
    });
  });
};

/**
 * Round value in a way that is appropriate for an axis tick
 *
 * This is factored out from renderBarChart() because we need to
 * do this in a couple of places.
 *
 * @param {function} roundingFunc - function to use to round the value. This will
 *   probably either be Math.floor(), to round down, or Math.ceil(), to round
 *   up.
 * @param {Number} roundTicksFactor - Factor to round to.  For example, 5 will
 *   cause the number to be rounded to the nearest multiple of 5.
 * @param {Number} d - Number to round.
 */
var roundValueForTick = function(roundingFunc, roundTicksFactor, d) {
  return roundingFunc(d / roundTicksFactor) * roundTicksFactor;
};


/*
 * Render the graphic(s). Called by pym with the container width.
 *
 * Since this takes more arguments than the container width, you should
 * partially apply the additional arguments, such as `chartConfigs` using
 * `bind()` when specifying this function as the `renderCallback` for
 * pym.
 *
 * @param {Object[]} chartConfigs - Chart configuration that can be passed to
 *   renderBarChart().
 * @param {string|Element} chartConfigs[].container - Container element (or selector)
 *   for the graphic.  This should be a value that can be passed to
 *   d3.select().
 * @param {string} chartConfigs[].header - Chart title.
 * @param {Number} chartConfigs[].xScaleMax - Maximum value of x-axis.
 * @param {Number} containerWidth - Width of chart container element, from pym.
 */
var render = function(chartConfigs, containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Clear out existing content in parent container
    // Most importantly, this removes the fallback image
    d3.select('#bar-chart').html('');

    // Render the charts!
    chartConfigs.forEach(function(conf) {
        // Update the width
        conf['width'] = containerWidth;
        // Create a container element for each of the subplots
        conf['container'] = d3.select('#bar-chart').append('div')
                .attr('class', 'graphic')
                // We will eventually select this container inside
                // renderBarChart() with d3.select(), which can either
                // take a CSS selector string, or a DOM node, but not
                // a D3 selection, so we need to convert our selection
                // to a node.
                .node();
        renderBarChart(conf);
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 * @param {Object} config - Chart configuration.
 * @param {string|Element} config.container - Container element (or selector)
 *   for the graphic.  This should be a value that can be passed to
 *   d3.select().
 * @param {string} config.header - Chart title.
 * @param {Number} config.width - Width of chart container element, from pym.
 * @param {Number} config.xScaleMax - Maximum value of x-axis.
 * @param {function} config.barClass - Function that returns a class name for
 *   the bar elements in the rendered SVG.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 95;
    var labelMargin = 6;
    var valueGap = 6;
    var barClass = config.barClass || function(d, i) {
        return 'bar-' + i + ' ' + classify(d[labelColumn]);
    };

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Add header
     */
    containerElement.append('h3')
      .text(config['header']);

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
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        return roundValueForTick(Math.floor, roundTicksFactor, d[valueColumn]);
    });

    if (min > 0) {
        min = 0;
    }

    // TODO: Can we just round the max value, instead of rounding each value in the data?
    var max = config.xScaleMax || d3.max(config['data'], function(d) {
        return roundValueForTick(Math.ceil, roundTicksFactor, d[valueColumn]);
    });

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d.toFixed(0) + '%';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight)
            .attr('class', barClass);

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'width': labelWidth + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap)) + 'px;'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
                });

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d) {
                return d[valueColumn].toFixed(0) + '%';
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()

                // Negative case
                if (d[valueColumn] < 0) {
                    var outsideOffset = -(valueGap + textWidth);

                    if (xStart + outsideOffset < 0) {
                        d3.select(this).classed('in', true)
                        return valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return outsideOffset;
                    }
                // Positive case
                } else {
                    if (xStart + valueGap + textWidth > chartWidth) {
                        d3.select(this).classed('in', true)
                        return -(valueGap + textWidth);
                    } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    }
                }
            })
            .attr('dy', (barHeight / 2) + 3)
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
