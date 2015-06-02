// Configuration
var GRAPHIC_ID = '#graphic';
// var GRAPHIC_DATA = null; <-- defined in child_template.html
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;

var GRAPHIC_MARGIN = {
    top: 5,
    right: 70,
    bottom: 30,
    left: 35
};

var ANNOTATIONS = [
    { 'label': 'July 4, 2008', 'x': d3.time.format('%m/%d/%Y').parse('7/4/2008'), 'y': 142.46, 'offset': 16 },
    { 'label': '$142.46/barrel', 'x': d3.time.format('%m/%d/%Y').parse('7/4/2008'), 'y': 142.46, 'offset': 3 },
    { 'label': 'Feb. 13, 2009', 'x': d3.time.format('%m/%d/%Y').parse('2/13/2009'), 'y': 36.91, 'offset': -12 },
    { 'label': '$36.91/barrel', 'x': d3.time.format('%m/%d/%Y').parse('2/13/2009'), 'y': 36.91, 'offset': -25 },
    { 'label': 'May 6, 2015', 'x': d3.time.format('%m/%d/%Y').parse('5/6/2015'), 'y': 60.67, 'offset': 16 },
    { 'label': '$60.93/barrel', 'x': d3.time.format('%m/%d/%Y').parse('5/6/2015'), 'y': 60.93, 'offset': 3 }
];


// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

// Globals
var $graphic = null;
var pymChild = null;
var isMobile = false;


/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    $graphic = $(GRAPHIC_ID);

    if (Modernizr.svg) {
        GRAPHIC_DATA.forEach(function(d) {
            d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
            d['amt'] = +d['amt'];
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
        .range([ COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);

    // Desktop / default
    var aspectWidth = 4;
    var aspectHeight = 3;
    var ticksX = 10;
    var ticksY = 10;

    // Mobile
    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
        ticksX = 5;
        ticksY = 5;
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
        .tickFormat(function(d) {
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
                return Math.ceil(n/20) * 20; // round to next 20
            });
        })
    ]);

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

    // labels
    var annotations = svg.append('g')
        .attr('class', 'annotations')
        .selectAll('text')
            .data(ANNOTATIONS)
        .enter()
            .append('text')
                .attr('dx', function(d) {
                    return x(d['x']);
                })
                .attr('dy', function(d) {
                    return y(d['y']) - d['offset'];
                })
                .text(function(d) {
                    return d['label'];
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
