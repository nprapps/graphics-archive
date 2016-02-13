// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var ecigData = null;
var tobaccoData = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData();
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function() {
//    graphicData = data;
    ecigData = ECIG_DATA;
    tobaccoData = TOBACCO_DATA;

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
    ecigData.forEach(function(d) {
        var x0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (key == 'label' || key == 'category' || key == 'values') {
                continue;
            }

            d[key] = +d[key] * 100;

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

    ecigData = ecigData.filter(function(d) {
        return d['category'] != 'generation';
    });

    tobaccoData.forEach(function(d) {
        var x0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (key == 'label' || key == 'category' || key == 'values') {
                continue;
            }

            d[key] = +d[key] * 100;

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

    tobaccoData = tobaccoData.filter(function(d) {
        return d['category'] != 'generation';
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

    var graphicWidth = null;

    var labelWidth = 90;
    var numColumns = 2;
    var gutterWidth = 15;
    if (isMobile) {
        gutterWidth = 0;
    }

    graphicWidth = Math.floor((containerWidth - labelWidth - (gutterWidth * (numColumns - 1))) / 2);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    // draw the bar values
    containerElement.append('div')
        .attr('id', 'barLabels')
        .attr('style', function() {
            var s = '';
            s += 'width: ' + labelWidth + 'px; ';
            s += 'height: 200px; '
            return s;
        });
    renderBarLabels({
        container: '#barLabels',
        width: labelWidth,
        data: ecigData
    });

    // Render the chart!
    containerElement.append('div')
        .attr('id', 'ecig')
        .attr('class', 'stacked-bar-chart')
        .attr('style', 'width: ' + graphicWidth + 'px;');
    renderStackedBarChart({
        container: '#ecig',
        width: graphicWidth,
        data: ecigData,
        title: HED_ECIG
    });

    containerElement.append('div')
        .attr('id', 'tobacco')
        .attr('class', 'stacked-bar-chart')
        .attr('style', 'width: ' + graphicWidth + 'px; margin-left: ' + gutterWidth + 'px;');
    renderStackedBarChart({
        container: '#tobacco',
        width: graphicWidth,
        data: tobaccoData,
        title: HED_TOBACCO
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked bar chart.
 */
var renderBarLabels = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 25;
    var barGap = 5;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': config['width'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'width': config['width'] + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap)) + 'px;'
                });
            })
            .attr('class', function(d) {
                return 'l-' + classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
                });
}

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 25;
    var barGap = 5;
    var labelWidth = 0;
    var labelMargin = 11;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 10;

    if (isMobile) {
        ticksX = 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);

    containerElement.append('h3')
        .attr('style', function() {
            var s = '';
            s += 'margin-left: ' + margins['left'] + 'px; ';
            s += 'margin-right: ' + margins['right'] + 'px; ';
            return s;
        })
        .text(config['title']);

    /*
     * Create D3 scale objects.
     */
     var min = d3.min(config['data'], function(d) {
         var lastValue = d['values'][d['values'].length - 1];

         return Math.floor(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
     });

     if (min > 0) {
         min = 0;
     }

     var xScale = d3.scale.linear()
         .domain([ 0, 100 ])
         .rangeRound([0, chartWidth]);

    if (isMobile) {
        xScale.domain()[1] = 50;
    }

     var colorScale = d3.scale.ordinal()
         .domain(d3.keys(config['data'][0]).filter(function(d) {
             return d != labelColumn && d != 'category' && d != 'values';
         }))
         .range([ COLORS['blue3'], '#f1f1f1' ]);

    /*
     * Render the legend.
     */
    // var legend = containerElement.append('ul')
	// 	.attr('class', 'key')
	// 	.selectAll('g')
	// 		.data(colorScale.domain())
	// 	.enter().append('li')
	// 		.attr('class', function(d, i) {
	// 			return 'key-item key-' + i + ' ' + classify(d);
	// 		});
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
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
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
                 return 'group ' + classify(d[labelColumn]);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }

                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .style('fill', function(d) {
                 return colorScale(d['name']);
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

     /*
      * Render bar values.
      */
     group.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) {
            return d['values'].filter(function(v,k){
                return k == 0;
            });
        })
        .enter().append('text')
            .text(function(d) {
                if (d['val'] != 0) {
                    return d['val'].toFixed(0) + '%';
                }
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d) {
 				return xScale(d['x1']);
            })
            .attr('dx', valueGap)
            .attr('dy', (barHeight / 2) + 4)
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
