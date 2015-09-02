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
//         var y0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'total' || key == 'year' || key == 'domain') {
                continue;
            }

            d[key] = +d[key];
            
            var y0 = null;
            var y1 = null;
            
//             if (key < 0) {
                y0 = 0;
                y1 = d[key];
//             } else {
//                 y0 = d[key];
//                 y1 = 0;
//             }

            d['values'].push({
                'name': key,
                'y0': y0,
                'y1': y1,
                'val': d[key]
            })

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
    renderStackedColumnChart({
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
 * Render a stacked column chart.
 */
var renderStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var aspectWidth = 16;
    var aspectHeight = 9;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 30
    };

    var ticksY = 5;
    var roundTicksFactor = 50;

    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
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
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'domain'))
        .rangeRoundBands([0, chartWidth], .1)
    
    var yScale = d3.scale.linear()
        .domain([ -60, 60 ])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            return d != labelColumn && d != 'values' && d != 'total' && d != 'year' && d != 'domain';
        }))
        .range([ COLORS['teal2'], COLORS['teal5'] ]);

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
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d;
        });

    // year backgrounds
    var bars = chartElement.append('g')
        .attr('class', '.bg-bars')
        .selectAll('rect')
            .data([ { 'year': '1999', 'amt': 6, 'candidate': 'E. Dole1999' },
                    { 'year': '2003', 'amt': 2, 'candidate': 'Clark2003' },
                    { 'year': '2007', 'amt': 9, 'candidate': 'Huckabee2007' },
                    { 'year': '2011', 'amt': 3, 'candidate': 'Perry2011' },
                    { 'year': '2015', 'amt': 11, 'candidate': 'John Kasich2015' }
                 ])
        .enter().append('rect')
            .attr('x', function(d, i) {
                var offset = null;
                switch(d['year']) {
                    case '1999':
                        offset = null;
                        break;
                    case '2003':
                        offset = 6;
                        break;
                    case '2007':
                        offset = 8;
                        break;
                    case '2011':
                        offset = 17;
                        break;
                    case '2015':
                        offset = 20;
                        break;
                }
                return xScale(d['candidate']);
            })
            .attr('y', 0)
            .attr('width', function(d,i) {
                return (xScale.rangeBand() * d['amt']) + ((xScale.rangeBand() * .1) * (d['amt'] - 1));
            })
            .attr('height', chartHeight)
            .style('fill', function(d, i) {
                if (i % 2 == 0) {
                    return '#f1f1f1';
                } else {
                    return '#fff';
                }
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
            .attr('class', function(d) {
                return 'bar ' + classify(d['label'])
            })
            .attr('transform', function(d) {
                return makeTranslate(xScale(d['domain']), 0);
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
                var h = Math.abs(yScale(d['y0']) - yScale(d['y1']));
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .style('fill', function(d) {
                return colorScale(d['name']);
            })
            .attr('class', function(d) {
                return classify(d['name']);
            });

    /*
     * Render values to chart.
     */
//     bars.selectAll('text')
//         .data(function(d) {
//             return d['values'];
//         })
//         .enter().append('text')
//             .text(function(d) {
//                 return d['val'];
//             })
//             .attr('class', function(d) {
//                 return classify(d['name']);
//             })
//             .attr('x', function(d) {
//                 return xScale.rangeBand() / 2;
//             })
//             .attr('y', function(d) {
//                 var textHeight = d3.select(this).node().getBBox().height;
//                 var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));
// 
//                 if (textHeight + valueGap * 2 > barHeight) {
//                     d3.select(this).classed('hidden', true);
//                 }
// 
//                 var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);
// 
//                 return barCenter + textHeight / 2;
//             })
//             .attr('text-anchor', 'middle');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
