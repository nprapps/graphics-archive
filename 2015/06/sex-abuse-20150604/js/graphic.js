// global vars
var $graphic = null;
var pymChild = null;

var BAR_HEIGHT = 20;
var BAR_GAP = 5;
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRAPHIC_GUTTER = 6;
var LABEL_MARGIN = 10;
var LABEL_WIDTH = 60;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_WIDTH = 30;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

var isMobile = false;

/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

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
    drawGraph('female', containerWidth);
    drawGraph('male', containerWidth);
    
    // update iframe    
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(id, graphicWidth) {
    var graphicData = eval('GRAPHIC_DATA_' + id.toUpperCase());

    var graph = d3.select('#graphic');
    var margin = {
        top: 0,
        right: 20,
        bottom: 20,
        left: (LABEL_WIDTH + LABEL_MARGIN)
    };
    var numBars = graphicData.length;
    var ticksX = isMobile ? 4 : 6;

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = ((BAR_HEIGHT + BAR_GAP) * numBars);

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
            return d + '%';
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    graph.append('h3')
        .attr('style', 'margin-left: ' + margin['left'] + 'px;')
        .text(id);

    var wrapper = graph.append('div')
        .attr('class', 'wrapper ' + id)
        .attr('style', 'width: ' + (graphicWidth + margin['left']) + 'px;');
    
    // draw the chart
    var svg = wrapper.append('svg')
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

    // draw the bars
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('line')
            .data(graphicData)
        .enter().append('line')
            .attr('x1', function(d, i) {
                return x(d['min']);
            })
            .attr('x2', function(d, i) {
                return x(d['max']);
            })
            .attr('y1', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2);
            })
            .attr('y2', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2);
            });

    // values
    svg.append('g')
        .attr('class', 'amts')
        .selectAll('circle')
            .data(graphicData)
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return x(+d['amt']);
            })
            .attr('cy', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2);
            })
            .attr('r', 5)

    // show values
    for (var l = 0; l < 2; l++) {
        svg.append('g')
            .attr('class', function(d) {
                if (l == 0) {
                    return 'value shadow';
                } else {
                    return 'value';
                }
            })
            .selectAll('text')
            .data(graphicData)
            .enter().append('text')
                .attr('x', function(d, i) {
                    return x(+d['max']) + 6;
                })
                .attr('y', function(d,i) {
                    return i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2) + 3;
                })
                .text(function(d) {
                    var amt = +d['amt'];
                    return amt.toFixed(1) + '%';
                });
    }

    // draw labels for each bar
    var labels = wrapper.append('ul')
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
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
