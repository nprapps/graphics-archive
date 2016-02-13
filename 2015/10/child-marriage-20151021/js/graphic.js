// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 550;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var totalsData = null;

// D3 formatters
var fmtComma = d3.format(',');

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        totalsData = TOTALS_DATA;
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
    totalsData.forEach(function(d) {
        var x0 = 0;

        d['values'] = [];
        
        for (var key in d) {
            if (key == 'label' || key == 'values' ) {
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

    graphicData.forEach(function(d) {
        var x0 = 0;

        d['values'] = [];
        
        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'age18' ) {
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
    
    graphicData = graphicData.filter(function(d,i) {
        return i < 11;
    })
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }
    
    var gutterWidth = 22;
    var graphicWidth = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }
    
    // define color scale
    var colorScale = d3.scale.ordinal()
         .domain(d3.keys(graphicData[0]).filter(function(d) {
             return d != 'label' && d != 'values' && d != 'age18';
         }))
         .range([ COLORS['teal3'], COLORS['teal5'] ]);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    // Legend
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


    // Render the chart!
    containerElement.append('div')
        .attr('id', 'pct')
        .classed('marriage-chart', true);

    renderStackedBarChart({
        container: '#pct',
        width: graphicWidth,
        data: graphicData,
        colorScale: colorScale,
        units: 'pct',
        title: HED_PCT
    });

    // Render the chart!
    containerElement.append('div')
        .attr('id', 'totals')
        .classed('marriage-chart', true);

    renderStackedBarChart({
        container: '#totals',
        width: graphicWidth,
        data: totalsData,
        colorScale: colorScale,
        units: 'amt',
        title: HED_TOTALS
    });
    
    if (!isMobile) {
        d3.selectAll('.marriage-chart')
            .attr('style', function(d, i) {
                var s = '';
                s += 'width: ' + graphicWidth + 'px;';
                if (i > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px;';
                }
                return s;
            });
    }
    
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
    var totalColumn = 'amt';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 85;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 10;
    
    switch(config['units']) {
        case 'pct':
            roundTicksFactor = 100;
            totalColumn = 'age18'
            break;
        case 'amt':
            roundTicksFactor = 12000000;
            totalColumn = 'Married by age 18';
            break;
    }
    
    if (isMobile) {
        ticksX = 2;
        labelWidth = 80;
        margins['left'] = (labelWidth + labelMargin);
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');
    
    // add title
    containerElement.append('h3')
        .html(config['title']);

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
         .domain([
             min,
             d3.max(config['data'], function(d) {
                 var lastValue = d['values'][d['values'].length - 1];

                 return Math.ceil(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
             })
         ])
         .rangeRound([0, chartWidth]);

     var colorScale = config['colorScale'];

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
            switch(config['units']) {
                case 'pct':
                    return d + '%';
                    break;
                case 'amt':
                    if (d == 0) {
                        return 0;
                    } else {
                        var a = d / 1000000;
                        return a.toFixed(0) + ' million';
                    }
                    break;
            }
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
//              .style('fill', function(d) {
//                  return colorScale(d['name']);
//              })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

     chartElement.append('g')
        .attr('class', 'value total')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .text(function(d) {
                d[totalColumn] = +d[totalColumn];
                switch(config['units']) {
                    case 'pct':
                        return d[totalColumn].toFixed(0) + '%';
                        break;
                    case 'amt':
                        var a = d[totalColumn] / 1000000;
                        if (config['width'] < 270) {
                            return a.toFixed(1) + 'M';
                        } else {
                            return a.toFixed(1) + ' million';
                        }
                        break;
                }
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('x', function(d) {
 				return xScale(d[totalColumn]);
            })
            .attr('y', function(d, i) {
                return (i * (barHeight + barGap));
            })
            .attr('dx', 6)
            .attr('dy', (barHeight / 2) + 3)

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
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
