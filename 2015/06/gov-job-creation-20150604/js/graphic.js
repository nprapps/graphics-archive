// global vars
var $graphic = null;
var pymChild = null;

var BAR_HEIGHT = 40;
var BAR_HEIGHT_BULLET = 16;
var BAR_GAP = 10;
// var GRAPHIC_DATA;
var GRAPHIC_DEFAULT_WIDTH = 600;
var LABEL_MARGIN = 6;
var LABEL_WIDTH = 110;
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

        GRAPHIC_DATA.forEach(function(d) {
            d['state'] = +d['state_change'];
            d['us'] = +d['us_change'];
        });
        
        console.log(GRAPHIC_DATA);

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
    var height = ((BAR_HEIGHT + BAR_GAP) * numBars);

    var x = d3.scale.linear()
        .domain([ 0, d3.max(GRAPHIC_DATA, function(d) {
            return Math.ceil(d['state']/10) * 10; // round to next 10
        }) ])
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
        .attr('class', 'key');
    
    var keyState = legend.append('li')
        .attr('class', 'key-item key-0 state');
    keyState.append('b')
        .attr('class', 'd');
    keyState.append('b')
        .attr('class', 'r');
    keyState.append('label')
        .text('State job growth during term');
    
    var keyUS = legend.append('li')
        .attr('class', 'key-item key-0 state');
    keyUS.append('b')
        .attr('class', 'us');
    keyUS.append('label')
        .text('U.S. job growth during term');
    
    var chart = graph.append('div')
        .attr('class', 'wrapper');

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

    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    // draw the us bars
    svg.append('g')
        .attr('class', 'bars us')
        .selectAll('rect')
            .data(GRAPHIC_DATA)
        .enter().append('rect')
            .attr('y', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP);
            })
            .attr('width', function(d){
                return x(d['us']);
            })
            .attr('height', BAR_HEIGHT)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d['candidate']);
            });

    // draw the state bars
    svg.append('g')
        .attr('class', 'bars state')
        .selectAll('rect')
            .data(GRAPHIC_DATA)
        .enter().append('rect')
            .attr('y', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP) + Math.floor((BAR_HEIGHT - BAR_HEIGHT_BULLET) /2);
            })
            .attr('width', function(d){
                return x(d['state']);
            })
            .attr('height', BAR_HEIGHT_BULLET)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d['candidate']) + ' ' + d['party'].toLowerCase();
            });

    // show the values for each bar
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(GRAPHIC_DATA)
        .enter().append('text')
            .attr('x', function(d) {
                return x(d['state']);
            })
            .attr('y', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP);
            })
            .attr('dx', 6)
            .attr('dy', (BAR_HEIGHT / 2) + 3)
            .attr('text-anchor', 'begin')
            .attr('class', function(d) {
                var c = classify(d['candidate']) + ' out';
                return c;
            })
            .text(function(d) {
                return d['state'].toFixed(0) + '%';
            });

    // draw labels for each bar
    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + LABEL_WIDTH + 'px; top: ' + margin['top'] + 'px; left: 0;')
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
                return classify(d['candidate']);
            })
            .append('span')
                .html(function(d) {
                    var label = d['candidate'] + ' (' + d['party'] + ')<br />'
                    label += d['state_full'];
                    label += '<i>(' + d['term_abbr'] + ')</i>';
                    return label;
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
