// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        graphicData = data;

        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    graphicData.forEach(function(d) {
        var x0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'Total' || key == 'us_share') {
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];

            d['values'].push({
                'name': key,
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })

            x0 = x1;
        }
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderStackedBarChart({
        container: '#graphic',
        width: containerWidth,
        data: graphicData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 35;
    var barGap = 5;
    var labelWidth = 120;
    var labelMargin = 6;
    var valueMinWidth = 30;
    
    if (isMobile) {
        barHeight = 50;
        labelWidth = 100;
    }

    var margins = {
        top: 0,
        right: 30,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksX = 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
     var xScale = d3.scale.linear()
         .domain([0, 15])
         .rangeRound([0, chartWidth]);
    if (isMobile) {
        xScale.domain([ 0, 20 ]);
    }

     var colorScale = d3.scale.ordinal()
         .domain(d3.keys(config['data'][0]).filter(function(d) {
             return d != 'label' && d != 'values' && d != 'Total' && d != 'us_share';
         }))
         .range([ COLORS['teal3'], COLORS['teal6'] ]);

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
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return '$' + d + ' billion';
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
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d['label']);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('height', barHeight)
             .attr('x', function(d) {
                 return xScale(d['x0']);
             })
             .attr('width', function(d) {
                 return xScale(d['x1']) - xScale(d['x0']);
             })
             .style('fill', function(d) {
                 return colorScale(d['name']);
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

     /*
      * Render bar values.
      */
     var values = chartElement.append('g')
         .attr('class', 'value')
         .selectAll('text')
             .data(config['data'])
         .enter().append('text')
             .attr('x', function(d, i) {
                return xScale(+d['Total']);
             })
             .attr('y', function(d,i) {
                 return (i * (barHeight + barGap)) + 2;
             })
             .attr('dx', function(d, i) {
  				return 6;
             })
             .attr('dy', (barHeight / 2) + 4)
             .attr('text-anchor', 'begin')
             .attr('class', function(d) {
                  return classify(d['label']);
             });
    values.append('tspan')
        .attr('x', function(d,i) {
            var p = d3.select(this.parentNode);
            return p.attr('x');
        })
        .attr('dx', function(d,i) {
            var p = d3.select(this.parentNode);
            return p.attr('dx');
        })
        .attr('dy', '1.2em')
        .text(function(d) {
            var us = d['United States'];
            var us_val = us.toFixed(1);
            if (us < 1) {
                us_val = us.toFixed(2);
            }
            var share = +d['us_share'];
            return '$' + us_val + ' billion (' + share.toFixed(0) + '%)';
        });
    values.append('tspan')
        .attr('x', function(d,i) {
            var p = d3.select(this.parentNode);
            return p.attr('x');
        })
        .attr('dx', function(d,i) {
            var p = d3.select(this.parentNode);
            return p.attr('dx');
        })
        .attr('dy', '1.2em')
        .text(function(d) {
            var total = +d['Total'];
            var total_value = total.toFixed(1);
            if (total < 1) {
                total_value = total.toFixed(2);
            }
            return 'of $' + total_value + ' billion total';
        });


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
                .html(function(d) {
                    return d[labelColumn];
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
