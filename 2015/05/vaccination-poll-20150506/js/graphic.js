// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

var DOT_RADIUS = 4;
var GROUP_HEIGHT = 20;
var GROUP_GAP = 5;
var BAR_HEIGHT = 4;
var BAR_GAP = 5;
// var GRAPHIC_DATA = null; <!-- defined in child_template.html
var GRAPHIC_DEFAULT_WIDTH = 600;
var LABEL_MARGIN = 6;
var LABEL_WIDTH = 105;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_WIDTH = 30;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

var colorD3;
var isMobile = false;

/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        GRAPHIC_DATA.forEach(function(d) {
            colorD3 = d3.scale.ordinal()
                .range([ COLORS['teal4'], COLORS['teal1'] ])
                .domain(d3.keys(GRAPHIC_DATA[0]).filter(function(d) {
                    return d != 'label' && d != 'grouping';
                }));
            
            GRAPHIC_DATA.forEach(function(d) {
                colorD3.domain().forEach(function(v) {
                    d[v] = +d[v];
                })
            });
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

    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(containerWidth);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth) {
    var graph = d3.select('#graphic');
    var margin = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (LABEL_WIDTH + LABEL_MARGIN)
    };
    var numBars = GRAPHIC_DATA.length;
    var ticksX = 4;

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = ((GROUP_HEIGHT + GROUP_GAP) * numBars);

    var x = d3.scale.linear()
        .domain([ 0, 50 ])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d.toFixed(0) + '%';
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    // draw the legend
    var legend = graph.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorD3.domain())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});
    legend.append('b')
        .style('background-color', function(d) {
            return colorD3(d);
        });
    legend.append('label')
        .text(function(d) {
            return d;
        });

    // draw the chart
    var chart = graph.append('div')
        .attr('class', 'chart');

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

    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    // draw the guidelines
    svg.append('g')
        .attr('class', 'guidelines')
        .selectAll('line')
            .data(GRAPHIC_DATA)
        .enter().append('line')
            .attr('x1', 0)
            .attr('x2', function(d){
                var xPos = null;
                if (d[colorD3.domain()[0]] > d[colorD3.domain()[1]]) {
                    xPos = x(d[colorD3.domain()[1]]);
                } else {
                    xPos = x(d[colorD3.domain()[0]]);
                }
                return xPos;
            })
            .attr('y1', function(d, i) {
                return (i * (GROUP_HEIGHT + GROUP_GAP)) + ((GROUP_HEIGHT - BAR_HEIGHT) / 2) + 2;
            })
            .attr('y2', function(d, i) {
                return (i * (GROUP_HEIGHT + GROUP_GAP)) + ((GROUP_HEIGHT - BAR_HEIGHT) / 2) + 2;
            })
            .attr('width', function(d){
                var w = null;
                if (d[colorD3.domain()[0]] > d[colorD3.domain()[1]]) {
                    w = x(d[colorD3.domain()[1]]);
                } else {
                    w = x(d[colorD3.domain()[0]]);
                }
                return w;
            })
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d['label']);
            });

    // draw the bars
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(GRAPHIC_DATA)
        .enter().append('rect')
            .attr('x', function(d){
                var xPos = null;
                if (d[colorD3.domain()[0]] > d[colorD3.domain()[1]]) {
                    xPos = x(d[colorD3.domain()[1]]);
                } else {
                    xPos = x(d[colorD3.domain()[0]]);
                }
                return xPos;
            })
            .attr('y', function(d, i) {
                return (i * (GROUP_HEIGHT + GROUP_GAP)) + ((GROUP_HEIGHT - BAR_HEIGHT) / 2);
            })
            .attr('width', function(d){
                var w = null;
                if (d[colorD3.domain()[0]] > d[colorD3.domain()[1]]) {
                    w = x(d[colorD3.domain()[0]]) - x(d[colorD3.domain()[1]]);
                } else {
                    w = x(d[colorD3.domain()[1]]) - x(d[colorD3.domain()[0]]);
                }
                return w;
            })
            .attr('height', BAR_HEIGHT)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d['label']);
            });
    
    // draw the dots
    colorD3.domain().forEach(function(id) {
        svg.append('g')
            .attr('class', 'dots ' + classify(id))
            .selectAll('circle')
                .data(GRAPHIC_DATA)
            .enter().append('circle')
                .attr('cx', function(d) { 
                    return x(d[id]);
                })
                .attr('cy', function(d,i) { 
                    return ((GROUP_HEIGHT + GROUP_GAP) * i) + (GROUP_HEIGHT / 2);
                })
                .attr('r', DOT_RADIUS)
                .attr('class', classify(id))
                .attr('fill', colorD3(id));
    })

    // draw values for each dot
    colorD3.domain().forEach(function(id) {
        svg.append('g')
            .attr('class', 'value ' + classify(id))
            .selectAll('text')
                .data(GRAPHIC_DATA)
            .enter().append('text')
                .attr('x', function(d) {
                    return x(d[id]);
                })
                .attr('y', function(d,i) { 
                    return ((GROUP_HEIGHT + GROUP_GAP) * i) + (GROUP_HEIGHT / 2);
                })
                .attr('text-anchor', function(d) {
                    var a = null;
                    if (d[id] >= d[colorD3.domain()[0]] && d[id] >= d[colorD3.domain()[1]]) {
                        a = 'begin';
                    } else {
                        a = 'end';
                    }
                    return a;
                })
                .attr('dx', function(d) {
                    var dx = null;
                    if (d[id] >= d[colorD3.domain()[0]] && d[id] >= d[colorD3.domain()[1]]) {
                        dx = 6;
                    } else {
                        dx = -6;
                    }
                    return dx;
                })
                .attr('dy', 3)
                .attr('class', classify(id))
                .attr('fill', colorD3(id))
                .text(function(d) {
                    return d[id].toFixed(0) + '%';
                });
    })


    // draw labels for each bar
    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + LABEL_WIDTH + 'px; top: 2px; left: 0;')
        .selectAll('li')
            .data(GRAPHIC_DATA)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + LABEL_WIDTH + 'px; ';
                s += 'height: ' + GROUP_HEIGHT + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (GROUP_HEIGHT + GROUP_GAP)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                 return classify(d['label']) + ' ' + classify(d['grouping']);
            })
            .append('span')
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