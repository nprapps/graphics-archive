// global vars
var $graphic = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'https://apps.npr.org/dailygraphics/graphics/2014-wh-briefings/data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRID_MARGIN = 11;
var MOBILE_THRESHOLD = 540;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var graphicData = null;
var gridIncrement = null;
var isMobile = false;

// D3 formatters
var fmtComma = d3.format(',');
var fmtMonth = d3.time.format('%b');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * INITIALIZE
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = data;
            graphicData.forEach(function(d) {
                d['date'] = d3.time.format('%Y-%m-%d').parse(d['Date']);
                delete d['Date'];
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
    var graphicWidth;

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
    
    graphicWidth = containerWidth;
    
    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    var keys = d3.keys(graphicData[0]).filter(function(key) { 
        return key !== 'date';
    });
    
    drawGraph(graphicWidth, keys[2]);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, id) {
    var aspectHeight = null;
    var aspectWidth = null;
    var color = d3.scale.ordinal()
        .range([ colors['teal3'] ]);
    var graph = d3.select('#graphic');
    var margin = { 
    	top: 5, 
    	right: 15, 
    	bottom: 30, 
    	left: 30
    };
    var ticksX = 5;
    var ticksY = 5;
    var monthTicks = [ d3.time.format('%Y-%m-%d').parse('2014-01-05'),
                       d3.time.format('%Y-%m-%d').parse('2014-04-01'),
                       d3.time.format('%Y-%m-%d').parse('2014-07-01'),
                       d3.time.format('%Y-%m-%d').parse('2014-10-01'),
                       d3.time.format('%Y-%m-%d').parse('2015-01-01') ];
                       
    if (isMobile) {
        aspectHeight = 3;
        aspectWidth = 4;
    } else {
        aspectHeight = 9;
        aspectWidth = 16;
    }

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((graphicWidth * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];

    var x = d3.time.scale()
        .range([ 0, width ])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickValues(monthTicks)
        .tickFormat(function(d,i) {
            if (fmtMonth(d) == 'Jul') {
                return 'July';
            } else {
                return fmtMonth(d) + '.';
            }
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY);

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
        if (column != id) continue;
        formattedData[column] = graphicData.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }
    
    // set the data domain
    x.domain(d3.extent(graphicData, function(d) { 
        return d['date'];
    }));

    y.domain([ 0, 300]);
    
    // draw the chart div
    var chart = graph.append('div')
        .attr('class', 'chart')
        .attr('style', function() {
            var s = '';
            s += 'width: ' + graphicWidth + 'px;';
            return s;
        });

    // draw the chart
    var svg = chart.append('svg')
		.attr('width', width + margin['left'] + margin['right'])
		.attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
            
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
