// global vars
var $graphic = null;
var pymChild = null;

var BAR_HEIGHT = 30;
var DOT_RADIUS = 6;
//var GRAPHIC_DATA; <!-- defined in child_template.html
var GRAPHIC_DEFAULT_WIDTH = 600;
var LABEL_MARGIN = 6;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_WIDTH = 30;

var barGap = null;
var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var colorD3 = null;
var colorErrorD3 = null;
var labelWidth = null;
var isMobile = false;
var keys = [];

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
            d['ci_low'] = +d['ci_low'];
            d['gap'] = +d['gap'];
            d['ci_high'] = +d['ci_high'];
        });
        
        GRAPHIC_DATA.forEach(function(d) {
            keys.push(d['type']);
        });
        keys = d3.set(keys).values();

        colorD3 = d3.scale.ordinal()
            .range([ colors['teal4'], colors['orange4'], colors['blue3'] ])
            .domain(keys);

        colorErrorD3 = d3.scale.ordinal()
            .range([ colors['teal6'], colors['orange6'], colors['blue6'] ])
            .domain(keys);

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
        labelWidth = 90;
        barGap = 5;
    } else {
        isMobile = false;
        labelWidth = 110;
        barGap = 0;
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
        top: 20,
        right: 20,
        bottom: 20,
        left: (labelWidth + LABEL_MARGIN)
    };
    var numBars = GRAPHIC_DATA.length;
    var tickValues = [ -10000, 0, 10000, 20000, 30000 ];
    if (isMobile) {
        tickValues = [ -15000, 0, 15000, 30000 ];
    }

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = ((BAR_HEIGHT + barGap) * numBars);

    var x = d3.scale.linear()
        .domain([ -15000, 30000 ])
//         .domain([ d3.min(GRAPHIC_DATA, function(d) {
//             return Math.floor(d['ci_low']/10000) * 10000; // round to next 10K
//         }), d3.max(GRAPHIC_DATA, function(d) {
//             return Math.ceil(d['ci_high']/10000) * 10000; // round to next 10K
//         }) ])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues(tickValues)
        .tickFormat(function(d) {
            return '$' + fmtComma(d.toFixed(0));
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    // draw the legend
    var legend = graph.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(keys)
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
    var axis = svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );
    
    // zero-bar
    axis.append('line')
        .attr('class', 'zero')
        .attr('x1', x(0))
        .attr('x2', x(0))
        .attr('y1', -height)
        .attr('y2', 0);

    // draw the bars
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(GRAPHIC_DATA)
        .enter().append('rect')
            .attr('x', function(d){
                return x(d['ci_low']);
            })
            .attr('y', function(d, i) {
                return (i * (BAR_HEIGHT + barGap)) + ((BAR_HEIGHT - (DOT_RADIUS * 2) - 8) / 2);
            })
            .attr('width', function(d){
                return x(d['ci_high']) - x(d['ci_low']);
            })
            .attr('height', (DOT_RADIUS * 2) + 8)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d['job']);
            })
            .attr('fill', function(d) {
                return colorErrorD3(d['type']);
            });

    // draw the dots
    svg.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
            .data(GRAPHIC_DATA)
        .enter().append('circle')
            .attr('cx', function(d) { 
                return x(d['gap']);
            })
            .attr('cy', function(d,i) { 
                return i * (BAR_HEIGHT + barGap) + (BAR_HEIGHT / 2);
            })
            .attr('r', DOT_RADIUS)
            .attr('style', function(d) {                
                return 'fill: ' + colorD3(d['type']);
            });

    // show the values for each bar
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(GRAPHIC_DATA)
        .enter().append('text')
            .attr('x', function(d) {
                return x(d['gap']);
            })
            .attr('y', function(d, i) {
                return i * (BAR_HEIGHT + barGap);
            })
            .attr('dx', DOT_RADIUS + 6)
            .attr('dy', (BAR_HEIGHT / 2) + 3)
            .attr('text-anchor', 'begin')
            .attr('class', 'out')
            .text(function(d) {
                if (d['gap'] < 0) {
                    return '-$' + fmtComma(Math.abs(d['gap'].toFixed(0)));
                } else {
                    return '$' + fmtComma(d['gap'].toFixed(0));
                }
            });

    // draw labels for each bar
    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + labelWidth + 'px; top: ' + margin['top'] + 'px; left: 0;')
        .selectAll('li')
            .data(GRAPHIC_DATA)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + labelWidth + 'px; ';
                s += 'height: ' + BAR_HEIGHT + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (BAR_HEIGHT + barGap)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                return classify(d['job']);
            })
            .append('span')
                .text(function(d) {
                    return d['job'];
                });
    
    // women label
    var womenLabel = svg.append('text')
        .attr('class', 'label top')
        .attr('text-anchor', 'end')
        .attr('y', -11)
        .attr('x', x(0))
        .attr('dx', -6)
        .html(function() {
            if (!isMobile) {
                return '&lsaquo; Female RNs paid more'
            } else {
                return '&lsaquo; Women paid more'
            }
        });

    // men label
    var menLabel = svg.append('text')
        .attr('class', 'label top')
        .attr('text-anchor', 'begin')
        .attr('y', -11)
        .attr('x', x(0))
        .attr('dx', 6)
        .html(function() {
            if (!isMobile) {
                return 'Male RNs paid more &rsaquo;'
            } else {
                return 'Men paid more &rsaquo;'
            }
        });
}


/*
 * HELPER FUNCTIONS
 */
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').replace('/', '-').replace('--', '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
