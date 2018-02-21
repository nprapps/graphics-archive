// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

var ASPECT_HEIGHT = 2.5;
var ASPECT_WIDTH = 1;
var GRAPHIC_DATA_URL = 'data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRAPHIC_GUTTER = 15;
var LABEL_WIDTH = 33;
var MOBILE_THRESHOLD = 500;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var colorD3 = d3.scale.ordinal()
    .range([ colors['teal2'], colors['teal5'], colors['teal5'], colors['teal5'], colors['teal5'] ]);
var graphicData = null;
var graphicDataKeys = [];
var isMobile = false;

var recession_dates = [
    { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
];

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * INITIALIZE
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        graphicD3 = d3.select('#graphic');

        d3.csv(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = data;
            graphicData.forEach(function(d) {
                d['date'] = d3.time.format('%Y').parse(d['Year']);
                delete d['Year'];
            });

            graphicDataKeys = d3.keys(graphicData[0]).filter(function(v) {
                return v != 'date';
            });

            recession_dates.forEach(function(d) {
                d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
                d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
            });

            pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
}


/*
 * RENDER THE GRAPHIC
 */
var render = function(containerWidth) {
    // fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    graphicWidth = (containerWidth - (GRAPHIC_GUTTER * (graphicDataKeys.length - 1)) - LABEL_WIDTH) / graphicDataKeys.length;
    graphicHeight = Math.ceil((graphicWidth * ASPECT_HEIGHT) / ASPECT_WIDTH);

    // assign a color to each line
    colorD3.domain(graphicDataKeys);

    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    for (var i = 0; i < graphicDataKeys.length; i++) {
        if (i == 0) {
            drawGraph(graphicWidth + LABEL_WIDTH, graphicHeight, graphicDataKeys[i], i);
        } else {
            drawGraph(graphicWidth, graphicHeight, graphicDataKeys[i], i);
        }
    }

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, graphicHeight, id, graphicNum) {
    var margin = {
    	top: 5,
    	right: 8,
    	bottom: 30,
    	left: 0
    };
    if (graphicNum == 0) {
        margin['left'] = LABEL_WIDTH;
    }
    var tickValuesX = [];
    var ticksX = 2;
    var ticksY;

    // params that depend on the container width
    if (isMobile) {
        ticksY = 2;
        tickValuesX = [ d3.time.format('%Y').parse('1993'),
                       d3.time.format('%Y').parse('2013') ];
    } else {
        ticksY = 5;
        tickValuesX = [ d3.time.format('%Y').parse('1993'),
                       d3.time.format('%Y').parse('2003'),
                       d3.time.format('%Y').parse('2013') ];
    }

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = graphicHeight - margin['top'] - margin['bottom'];

    var x = d3.time.scale()
        .range([ 0, width ])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues(tickValuesX)
        .tickFormat(function(d,i) {
            return '\u2019' + fmtYearAbbrev(d);
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY)
        .tickFormat(function(d,i) {
            return d.toFixed(0) + '%';
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

    // parse data into columns
    var formattedData = {};
    for (var column in graphicData[0]) {
        if (column != id) continue;
        formattedData[column] = graphicData.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
        });
    }

    // set the data domain
    x.domain(d3.extent(graphicData, function(d) {
        return d['date'];
    }));

    y.domain([ 0, 20 ]);

    // draw the chart
    var chart = graphicD3.append('div')
        .attr('class', 'chart ' + classify(id))
        .attr('style', function(d) {
            var s = '';
            s += 'width: ' + graphicWidth + 'px; ';
            s += 'float: left; ';
            if (graphicNum != 0) {
                s += 'margin-left: ' + GRAPHIC_GUTTER + 'px; ';
            }
            return s;
        });

    chart.append('h4')
        .attr('style', 'margin-left: ' + margin['left'] + 'px;')
        .text(id);

    var svg = chart.append('svg')
		.attr('width', width + margin['left'] + margin['right'])
		.attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // recession bars
    svg.append('g')
        .attr('class', 'recession')
        .selectAll('rect')
        .data(recession_dates)
        .enter()
            .append('rect')
                .attr('x', function(d) {
                    return x(d['begin']);
                })
                .attr('width', function(d) {
                    return x(d['end']) - x(d['begin']);
                })
                .attr('y', 0)
                .attr('height', height)
                .attr('fill', '#ebebeb');


    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // fix x-axis label alignment
    svg.selectAll('.x.axis .tick:nth-child(1) text')
        .attr('style', function(d) {
            return 'text-anchor: begin; ';
        });
    svg.selectAll('.x.axis .tick:nth-child(3) text')
        .attr('style', function(d) {
            return 'text-anchor: end; ';
        });

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
                return colorD3(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });
}


/*
 * HELPER FUNCTIONS
 */
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
