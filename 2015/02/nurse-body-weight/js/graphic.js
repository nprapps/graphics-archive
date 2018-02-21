// global vars
var $graphic = null;
var pymChild = null;

//var GRAPHIC_DATA; <-- DEFINED IN CHILD_TEMPLATE.HTML
var BAR_HEIGHT = 20;
var BAR_GAP = 2;
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRAPHIC_GUTTER = 11;
var LABEL_MARGIN = 6;
var LABEL_WIDTH = 20;
var MARGIN = {
    top: 0,
    right: 15,
    bottom: 20,
    left: 5
};
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_WIDTH = 30;

var bodyParts = [];
var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var labelKey = null;    
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
        
        bodyParts = d3.keys(GRAPHIC_DATA[0]);
        labelKey = bodyParts[0];
        
        GRAPHIC_DATA.forEach(function(d) {
            bodyParts.forEach(function(b) {
                d[b] = +d[b];
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
    
    var graphicWidth = containerWidth;

    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }
    
    graphicWidth = Math.floor((containerWidth - (LABEL_WIDTH + LABEL_MARGIN) - (GRAPHIC_GUTTER * (bodyParts.length - 2))) / (bodyParts.length - 1));

    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    bodyParts.forEach(function(d,i) {
        if (i != 0) {
            drawGraph(d, graphicWidth);
        }
    });

    // update iframe
    $('img.icon').load(function() {
        if (pymChild) {
            pymChild.sendHeight();
        }
    });
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(id, graphicWidth) {
    var isFirst = false;
    var isLast = false;
    var graph = d3.select('#graphic');
    var numBars = GRAPHIC_DATA.length;
    var ticksX = 2;
    
    if (id == bodyParts[1]) {
        isFirst = true;
    }
    if (id != bodyParts[ (bodyParts.length - 1) ]) {
        isLast = true;
    }

    // define chart dimensions
    var width = graphicWidth - MARGIN['left'] - MARGIN['right'];
    var height = ((BAR_HEIGHT + BAR_GAP) * numBars);

    var x = d3.scale.linear()
        .domain([ 0, 200 ])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d,i) {
            if (!isMobile || (isMobile && (i%2 == 0))) {
                return d.toFixed(0);
            }
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    // draw the chart
    var chart = graph.append('div')
        .attr('class', 'chart')
        .attr('style', function() {
            var s = '';
            if (isFirst) {
                s += 'width: ' + (graphicWidth + LABEL_WIDTH + LABEL_MARGIN) + 'px; ';
            } else {
                s += 'width: ' + graphicWidth + 'px; ';
            }
            if (isLast) {
                s += 'margin-right: ' + GRAPHIC_GUTTER + 'px; ';
            }
            return s;
        });
    
    var top = chart.append('div')
        .attr('class', 'top')
        .attr('style', function() {
            var s = '';
            if (isFirst) {
                s += 'padding-left: ' + (LABEL_WIDTH + LABEL_MARGIN) + 'px; ';
            }
            return s;
        });
    
    var icon = top.append('img')
        .attr('class', 'icon')
        .attr('src', function() {
            switch(id) {
                case bodyParts[1]:
                    return 'assets/head.svg';
                    break;
                case bodyParts[2]:
                    return 'assets/trunk.svg';
                    break;
                case bodyParts[3]:
                    return 'assets/arm.svg';
                    break;
                case bodyParts[4]:
                    return 'assets/leg.svg';
                    break;
            }
        })
        .attr('alt', id + ' illustration');
    
    top.append('h3')
        .attr('style', 'margin-left: ' + MARGIN['left'] + 'px;')
        .text(id);
    
    var wrap = chart.append('div')
        .attr('class', 'wrap');
    
    var svg = wrap.append('svg')
        .attr('width', width + MARGIN['left'] + MARGIN['right'])
        .attr('height', height + MARGIN['top'] + MARGIN['bottom'])
        .attr('style', function() {
            if (isFirst) {
                return 'margin-left: ' + (LABEL_WIDTH + LABEL_MARGIN) + 'px;';
            }
        })
        .append('g')
        .attr('transform', 'translate(' + MARGIN['left'] + ',' + MARGIN['top'] + ')');

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

    // draw the bars
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(GRAPHIC_DATA)
        .enter().append('rect')
            .attr('y', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP);
            })
            .attr('width', function(d){
                return x(d[id]);
            })
            .attr('height', BAR_HEIGHT)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' w-' + d[labelKey];
            });

    // show the values for each bar
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(GRAPHIC_DATA)
        .enter().append('text')
            .attr('x', function(d) {
                return x(d[id]);
            })
            .attr('y', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP);
            })
            .attr('dx', function(d) {
                if (x(d[id]) < VALUE_MIN_WIDTH) {
                    return 6;
                } else {
                    return -6;
                }
            })
            .attr('dy', (BAR_HEIGHT / 2) + 3)
            .attr('text-anchor', function(d) {
                if (x(d[id]) < VALUE_MIN_WIDTH) {
                    return 'begin';
                } else {
                    return 'end';
                }
            })
            .attr('class', function(d) {
                var c = 'w-' + d[labelKey];
                if (x(d[id]) < VALUE_MIN_WIDTH) {
                    c += ' outer';
                } else {
                    c += ' inner';
                }
                return c;
            })
            .text(function(d) {
                return d[id].toFixed(0);
            });
    
    // draw the labels
    if (isFirst) {
        wrap.append('ul')
            .attr('class', 'labels')
            .attr('style', function() {
                var s = '';
                s += 'width: ' + (LABEL_WIDTH + LABEL_MARGIN) + 'px; '
                s += 'height: 174px;';
                s += 'top: 0;';
                s += 'left: 0;';
                return s;
            })
            .selectAll('li')
                .data(GRAPHIC_DATA)
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
                    return 'w-' + d[labelKey];
                })
                .append('span')
                    .text(function(d) {
                        return d[labelKey];
                    });
    }
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
