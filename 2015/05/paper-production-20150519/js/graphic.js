// Configuration
var GRAPHIC_ID = '#graphic';
var GRAPHIC_DATA_URL = 'data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 480;

// D3 formatters
var fmtComma = d3.format(',');

// Globals
var $graphic = null;
var pymChild = null;
var graphicData = null;
var isMobile = false;

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    $graphic = $(GRAPHIC_ID);

    graphicData = GRAPHIC_DATA;

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Render the graphic(s)
 */
var render = function(containerWidth) {
    // Fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Clear out existing graphic (for re-drawing)
    $graphic.empty();

    drawGraph(containerWidth, GRAPHIC_ID, graphicData);

    // Resize iframe to fit
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, id, data) {
    var graph = d3.select(id);

    var color = d3.scale.ordinal()
        .range([ COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);

    // Desktop / default
    var aspectWidth = 4;
    var aspectHeight = 3;
    var ticksX = 10;
    var ticksY = 10;


    var GRAPHIC_MARGIN = {
        top: 10,
        right: 130,
        bottom: 20,
        left: 40
    };

    // Mobile
    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
        ticksX = 5;
        ticksY = 5;
        GRAPHIC_MARGIN['right'] = 35;
    }

    // define chart dimensions
    var width = graphicWidth - GRAPHIC_MARGIN['left'] - GRAPHIC_MARGIN['right'];
    var height = Math.ceil((graphicWidth * aspectHeight) / aspectWidth) - GRAPHIC_MARGIN['top'] - GRAPHIC_MARGIN['bottom'];

    var x = d3.scale.linear()
        .range([ 0, width ])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        })

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY)
        .tickFormat(function(d) {
            var val = (d * 100).toFixed(0) + '%';

            if (val == "-0%") {
                return '0%';
            }

            return val;
        });

    var yAxisGrid = function() {
        return yAxis;
    }

    // define the line(s)
    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return x(d['date']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

    // assign a color to each line
    color.domain(d3.keys(graphicData[0]).filter(function(key) {
        return key !== 'date';
    }));

    // parse data into columns
    var formattedData = {};

    for (var column in graphicData[0]) {
        if (column == 'date') continue;
        formattedData[column] = graphicData.map(function(d) {
            return { 'date': d['date'], 'amt': parseFloat(d[column]) };
        });
    }

    // set the data domain
    x.domain(d3.extent(graphicData, function(d) {
        return d['date'];
    }));

    var min = d3.min(d3.entries(formattedData), function(d) {
        return d3.min(d['value'], function(v) {
            return Math.floor(v['amt'] / 0.20) * 0.20;
        });
    });

    var max = d3.max(d3.entries(formattedData), function(d) {
        return d3.max(d['value'], function(v) {
            return Math.ceil(v['amt'] / 0.20) * 0.20;
        });
    });

    y.domain([min, max]);

    // draw the legend
    var legend = graph.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(d3.entries(formattedData))
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d['key']);
			});

    legend.append('b')
        .style('background-color', function(d) {
            return color(d['key']);
        });

    legend.append('label')
        .text(function(d) {
            return d['key'];
        });

    // draw the chart
    var svg = graph.append('svg')
		.attr('width', width + GRAPHIC_MARGIN['left'] + GRAPHIC_MARGIN['right'])
		.attr('height', height + GRAPHIC_MARGIN['top'] + GRAPHIC_MARGIN['bottom'])
        .append('g')
            .attr('transform', 'translate(' + GRAPHIC_MARGIN['left'] + ',' + GRAPHIC_MARGIN['top'] + ')');

    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // y-axis (left)
    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    // y-axis gridlines
    svg.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

    // 0-line
    svg.append('g')
        .attr('class', 'zero-line')
        .append('line')
        .attr('x1', x.range()[0])
        .attr('y1', y(0))
        .attr('x2', x.range()[1])
        .attr('y2', y(0))

    // draw the line(s)
    svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('stroke', function(d) {
                return color(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });

    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(d3.entries(formattedData))
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['value'][d['value'].length - 1];

                return x(last['date']) + 5;
            })
            .attr('y', function(d) {
                var last = d['value'][d['value'].length - 1];

                var offset = 3;

                if (isMobile) {
                    if (d['key'] == 'Tissue') {
                        offset = 0;
                    } else if (d['key'] == 'Containerboard') {
                        offset = 9;
                    }
                }

                return y(last['amt']) + offset;
            })
            .text(function(d) {
                var last = d['value'][d['value'].length - 1];
                var value = last['amt'];

                var label = (last['amt'] * 100).toFixed(0) + '%';

                if (value > 0) {
                    label = '+' + label;
                }

                if (!isMobile) {
                    label = d['key'] + ': ' + label;
                }

                return label;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
