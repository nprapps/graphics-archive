// global vars
var $graphic = null;
var pymChild = null;

// var GRAPHIC_DATA_TIME;
// var GRAPHIC_DATA_TYPE; <- both defined in child_template.html
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRAPHIC_GUTTER = 22;
var MOBILE_THRESHOLD = 500;

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

        GRAPHIC_DATA_TIME.forEach(function(d) {
            d['amt'] = +d['amt'];
        });

        GRAPHIC_DATA_TYPE.forEach(function(d) {
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
        graphicWidth = Math.floor((containerWidth - GRAPHIC_GUTTER) / 2);
    }

    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(graphicWidth, 'TIME');
    drawGraph(graphicWidth, 'TYPE');

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, id) {
    var aspectHeight = 3;
    var aspectWidth = 4;
    var data = eval('GRAPHIC_DATA_' + id);
    var margin = {  
        top: 5, 
        right: 5, 
        bottom: 20, 
        left: 33
    };
    var ticksY = 4;
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((width * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];
    
    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(data.map(function (d) {
            return d['label'];
        }));
    
    var y = d3.scale.linear()
        .range([height, 0])
        .domain([0, 10]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            } else {
                return d + '%';
            }
        });

    var y_axis_grid = function() { return yAxis; }
    
    // draw the chart itself
    var graph = d3.select('#graphic')
    	.append('div')
    		.attr('class', 'chart ' + classify(id))
    		.attr('style', function() {
    			var s = '';
    			s += 'width: ' + graphicWidth + 'px; ';
    			if (id == 'TIME') {
    				s += 'margin-right: ' + GRAPHIC_GUTTER + 'px; ';
    			}
    			return s;
    		});
    		
    graph.append('h3')
        .text(eval('HED_' + id));
    
    var svg = graph.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0)
            .tickFormat('')
        );

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(data)
        .enter().append('rect')
            .attr('x', function(d) {
                return x(d['label']);
            })
            .attr('y', function(d) {
                if (d['amt'] < 0) { 
                    return y(0);
                } else {
                    return y(d['amt']);
                }
            })
            .attr('width', x.rangeBand())
            .attr('height', function(d){ 
                if (d['amt'] < 0) { 
                    return y(d['amt']) - y(0);
                } else {
                    return y(0) - y(d['amt']);
                }
            })
            .attr('class', function(d) {
                return 'bar bar-' + d['label'];
            })
            .attr('fill', function(d) {
                if (d['label'] == '2013-14' || d['label'] == 'Overall') {
                    return colors['red3'];
                } else {
                    return colors['red5'];
                }
            });
    
    svg.append('line')
        .attr('class', 'y grid grid-0')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(0))
        .attr('y2', y(0));

    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(data)
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['label']) + (x.rangeBand() / 2);
            })
            .attr('y', function(d) { 
                return y(d['amt']) + 15;
            })
            .attr('text-anchor', 'middle')
            .attr('class', function(d) { 
                return classify(d['label']);
            })
            .text(function(d) { 
                return d['amt'].toFixed(1) + '%';
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