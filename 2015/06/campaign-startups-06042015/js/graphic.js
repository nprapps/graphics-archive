// Configuration
var GRAPHIC_ID = '#graphic';
var GRAPHIC_DATA_URL = 'data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;

var GRAPHIC_MARGIN = {
    top: 5,
    right: 45,
    bottom: 30,
    left: 50
};

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

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

    if (Modernizr.svg) {
        graphicData = GRAPHIC_DATA;

        graphicData.forEach(function(d) {
            d['days'] = +d['days'];
        });

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }
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
        .range([ COLORS['blue3'], COLORS['red3'], '#333', '#666', '#999', '#ccc' ]);

    // Desktop / default
    var aspectWidth = 5;
    var aspectHeight = 3;
    var ticksX = 10;
    var ticksY = 5;

    // Mobile
    if (isMobile) {
        aspectWidth = 5;
        aspectHeight = 3;
        ticksX = 5;
        ticksY = 5;
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
        .tickValues([365, 730, 1095, 1460, 1825])
        .tickFormat(function(d, i) {
            var val = d / 365;
            var label = val + ' year';

            if (val > 1) {
                label += 's';
            }

            return label;
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY)
        .tickValues([0, 400000000, 800000000, 1200000000, 1600000000])
        .tickFormat(function(d, i) {
            var val = d / 1000000;

            return '$' + fmtComma(val)
        });

    var yAxisGrid = function() {
        return yAxis;
    }

    // define the line(s)
    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return x(d['days']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

    // assign a color to each line
    color.domain(d3.keys(graphicData[0]).filter(function(key) {
        return key !== 'days';
    }));

    // parse data into columns
    var formattedData = {};
    for (var column in graphicData[0]) {
        if (column == 'days') continue;
        formattedData[column] = graphicData.map(function(d) {
            return { 'days': d['days'], 'amt': d[column] };
        // filter out empty data. uncomment this if you have inconsistent data.
        }).filter(function(d) {
            return d['amt'] !== null;
        });
    }

    // set the data domain
    x.domain([0, 1825]);

    y.domain([0, 1600000000]);

    // // draw the legend
    // var legend = graph.append('ul')
	// 	.attr('class', 'key')
	// 	.selectAll('g')
	// 		.data(d3.entries(formattedData))
	// 	.enter().append('li')
	// 		.attr('class', function(d, i) {
	// 			return 'key-item key-' + i + ' ' + classify(d['key']);
	// 		});
    //
    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return color(d['key']);
    //     });
    //
    // legend.append('label')
    //     .text(function(d) {
    //         return d['key'];
    //     });

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
        .attr('class', 'halo')
        .selectAll('text')
        .data(d3.entries(formattedData))
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['value'][d['value'].length - 1];

                return x(last['days']) + 5;
            })
            .attr('y', function(d) {
                var last = d['value'][d['value'].length - 1];

                var offset = 3;

                return y(last['amt']) + offset;
            })
            .text(function(d) {

                return d['key'];
            });

    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(d3.entries(formattedData))
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['value'][d['value'].length - 1];

                return x(last['days']) + 5;
            })
            .attr('y', function(d) {
                var last = d['value'][d['value'].length - 1];

                var offset = 3;

                return y(last['amt']) + offset;
            })
            .text(function(d) {

                return d['key'];
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
