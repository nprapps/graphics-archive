// Configuration
var GRAPHIC_ID = '#graphic';
// var GRAPHIC_DATA = null;
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;

var GRAPHIC_MARGIN = {
    top: 5,
    right: 15,
    bottom: 30,
    left: 30
};

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

// Globals
var graphic = null;
var pymChild = null;
var isMobile = false;

/*
 * Initialize graphic
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
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * CSV loaded
 */
var formatData = function() {
    GRAPHIC_DATA.forEach(function(d) {
        d['date'] = d3.time.format('%Y').parse(d['year']);
        d['wage'] = +d['wage'];
        d['adjusted_2016'] = +d['adjusted_2016'];

        delete d['year'];
        delete d['cpi'];
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
    d3.select(GRAPHIC_ID).html('');

    drawGraph(containerWidth, GRAPHIC_ID, GRAPHIC_DATA);

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
        .range([ COLORS['teal3'], COLORS['teal5'] ]);

    // Desktop / default
    var aspectWidth = 16;
    var aspectHeight = 9;
    var ticksX = 10;
    var ticksY = 6;

    // Mobile
    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
        ticksX = 5;
    }

    // define chart dimensions
    var width = graphicWidth - GRAPHIC_MARGIN['left'] - GRAPHIC_MARGIN['right'];
    var height = Math.ceil((graphicWidth * aspectHeight) / aspectWidth) - GRAPHIC_MARGIN['top'] - GRAPHIC_MARGIN['bottom'];

    var x = d3.time.scale()
        .range([ 0, width ])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            return '$' + d;
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
    color.domain(d3.keys(GRAPHIC_DATA[0]).filter(function(key) {
        return key !== 'date';
    }));

    // parse data into columns
    var formattedData = {};
    for (var column in GRAPHIC_DATA[0]) {
        if (column == 'date') continue;
        formattedData[column] = GRAPHIC_DATA.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    // set the data domain
    x.domain(d3.extent(GRAPHIC_DATA, function(d) {
        return d['date'];
    }));

    y.domain([ 0, d3.max(d3.entries(formattedData), function(c) {
            return d3.max(c['value'], function(v) {
                var n = v['amt'];
                return Math.ceil(n/2) * 2; // round to next 2
            });
        })
    ]);

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
            return eval('KEY_' + d['key'].toUpperCase());
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
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
 window.onload = onWindowLoaded;
