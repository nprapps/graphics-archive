// global vars
var $graphic = null;
var pymChild = null;

var BAR_HEIGHT = 30;
var BAR_GAP = 0;
var DOT_RADIUS = 6;
// var GRAPHIC_DATA; <!-- DEFINED IN CHILD_TEMPLATE.HTML
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRAPHIC_GUTTER = 22;
var LABEL_MARGIN = 6;
var LABEL_WIDTH = 110;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_WIDTH = 30;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var isMobile = false;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        GRAPHIC_DATA.forEach(function(d) {
            d['amt'] = +d['amt'];
        });

        pymChild = new pym.Child({
            renderCallback: render
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
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.ceil((containerWidth - GRAPHIC_GUTTER) / 2);
    }

    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(graphicWidth, 'white');
    drawGraph(graphicWidth, 'multi');

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, id) {
    var graph = d3.select('#graphic');
    var graphicData = GRAPHIC_DATA.filter(function(d) {
        return d['race'] == id;
    });
    var margin = {
        top: 0,
        right: 25,
        bottom: 20,
        left: (LABEL_WIDTH + LABEL_MARGIN)
    };
    var numBars = graphicData.length;
    var ticksX = 4;
    var tickValues = [ 50, 75, 100, 125, 150 ];

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = ((BAR_HEIGHT + BAR_GAP) * numBars);

    var x = d3.scale.linear()
        .domain([ 50, 150])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
//        .ticks(ticksX)
        .tickValues(tickValues)
        .tickFormat(function(d) {
            return d.toFixed(0);
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    // draw container for the chart
    var chart = graph.append('div')
        .attr('class', 'chart')
        .attr('style', function(d) {
            var s = '';
            if (!isMobile) {
                s += 'width: ' + graphicWidth + 'px; ';
                if (id == 'white') {
                    s += 'float: left; ';
                } else {
                    s += 'float: right; ';
                }
            } else if (isMobile && id == 'white') {
                s += 'margin-bottom: ' + GRAPHIC_GUTTER + 'px; ';
            }
            return s;
        });
    
    chart.append('h3')
        .html(eval('HDR_' + id.toUpperCase()));
    
    var innerChart = chart.append('div')
        .attr('class', 'chart-inner');

    // draw the chart
    var svg = innerChart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // alternating shaded rows
    var shaded_rows = svg.append('g')
        .attr('class', 'rows')
        .selectAll('rect')
            .data(graphicData)
        .enter().append('rect')
            .attr('class', 'bg-row')
            .attr('fill', function(d,i) {
                if (i % 2 == 0) {
                    return '#eee';
                } else {
                    return '#fff';
                }
            })
            .attr('style', 'opacity: 0.5;')
            .attr('width', width)
            .attr('height', BAR_HEIGHT)
            .attr('x', 0)
            .attr('y', function(d,i) {
                return (BAR_HEIGHT + BAR_GAP) * i;
            });

    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    // draw the dots
    var dots = svg.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
            .data(graphicData)
        .enter().append('circle')
            .attr('cx', function(d) { 
                return x(d['amt']);
            })
            .attr('cy', function(d,i) { 
                return i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2);
            })
            .attr('r', DOT_RADIUS)
            .attr('fill', function(d) {
                switch(id) {
                    case 'white':
                        return colors['blue3'];
                        break;
                    case 'multi':
                        return colors['orange3'];
                        break;
                }
            });

    // show the values for each bar
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(graphicData)
        .enter().append('text')
            .attr('x', function(d) {
                return x(d['amt']);
            })
            .attr('y', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP);
            })
            .attr('dx', 8)
            .attr('dy', (BAR_HEIGHT / 2) + 3)
            .attr('text-anchor', 'begin')
            .attr('class', function(d) {
                var c = classify(d['label']);
                c += ' out';
                return c;
            })
            .text(function(d) {
                return d['amt'].toFixed(0);
            });

    // draw labels for each bar
    var labels = innerChart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + LABEL_WIDTH + 'px; top: ' + margin['top'] + 'px; left: 0;')
        .selectAll('li')
            .data(graphicData)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + LABEL_WIDTH + 'px; ';
                s += 'height: ' + BAR_HEIGHT + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (BAR_HEIGHT + BAR_GAP)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                return classify(d['label']);
            })
            .append('span')
                .text(function(d) {
                    return d['label'];
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