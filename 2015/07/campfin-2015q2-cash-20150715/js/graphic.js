// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var dataKeys = [ 'campaign_cash', 'superpac_cash' ];

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
    graphicData.forEach(function(d,i) {
        var x0 = 0;
        var total = 0;

        d['values'] = [];

        for (var key in d) {
            if (_.contains(dataKeys, key)) {
                d[key] = +d[key];

                var x1 = x0 + d[key];
                
                total += d[key];

                if (d[key] != 0) {
                    d['values'].push({
                        'name': key,
                        'x0': x0,
                        'x1': x1,
                        'val': d[key],
                        'party': d['party'].toLowerCase()
                    })
                }

                x0 = x1;
            }
        }
        
        d['total'] = total;
    });
    
    // filter out entries without superpac money, then sort descending by total
    var filteredData = _.filter(graphicData, function(d, i) {
        return d[dataKeys[1]] != 0 && d[dataKeys[1]] != null;
    });
    var sortedData = _.sortBy(filteredData, 'total');
    graphicData = sortedData.reverse();
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
    var labelColumn = 'candidate';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 100;
    var labelMargin = 6;
    var valueMinWidth = 50;

    var margins = {
        top: 0,
        right: 20,
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
         .domain([ 0, MAX_VALUE ])
         .rangeRound([0, chartWidth]);

     var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            return d == dataKeys[0] || d == dataKeys[1];
        }))
        .range([ COLORS['red3'], COLORS['red5'] ]);

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
        .attr('class', function(d) {
            return 'democrat ' + classify(d);
        });
    legend.append('b')
        .attr('class', function(d) {
            return 'republican ' + classify(d);
        });

    legend.append('label')
        .text(function(d) {
            switch(d) {
                case dataKeys[0]:
                    return KEY_CAMPAIGN;
                    break;
                case dataKeys[1]:
                    return KEY_SUPERPAC;
                    break;
            }
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
            return '$' + (d.toFixed(0) / 1000000) + 'M';
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
             .attr('height', barHeight)
             .attr('x', function(d) {
                 return xScale(d['x0']);
             })
             .attr('width', function(d) {
                 return xScale(d['x1']) - xScale(d['x0']);
             })
             .attr('class', function(d) {
                 return classify(d['name']) + ' ' + classify(d['party']);
             });

     /*
      * Render bar values.
      */
     chartElement.append('g')
         .attr('class', 'value')
         .selectAll('text')
             .data(config['data'])
         .enter().append('text')
             .attr('x', function(d, i) {
 				return xScale(d['total']);
             })
             .attr('y', function(d, i) {
                return i * (barHeight + barGap);
             })
             .attr('dx', 6)
             .attr('dy', (barHeight / 2) + 4)
             .attr('text-anchor', 'begin')
             .attr('class', function(d) {
                 return classify(d['candidate']);
             })
             .text(function(d) {
                var v = d['total'].toFixed(0) / 1000000;

                if ((d['total'] / 1000000) > 0 && v == 0) {
                    v = '<1';
                } else {
                    v = v.toFixed(1);
                }
                
                return '$' + v + 'M total';
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
                .text(function(d) {
                    return d[labelColumn] + ' (' + d['party'].slice(0,1) + ')';
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
