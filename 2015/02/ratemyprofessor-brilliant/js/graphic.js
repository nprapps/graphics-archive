// global vars
var $graphic = null;
var pymChild = null;

var DOT_RADIUS = 4;
var GROUP_HEIGHT = 20;
var GROUP_GAP = 5;
var BAR_HEIGHT = 4;
var GRAPHIC_DATA_URL = 'brilliant.json';
var GRAPHIC_DEFAULT_WIDTH = 600;
var LABEL_MARGIN = 6;
var MOBILE_THRESHOLD = 480;
var VALUE_MIN_WIDTH = 30;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var graphicData;
var isMobile = false;
var labelWidth;

var keyData = [ 
    { 'key': 'Female professors', 'color': colors['red4'] },
    { 'key': 'Male professors', 'color': colors['blue3'] }
];


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

        d3.json(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = d3.entries(data);

            graphicData.forEach(function(d) {
                d['value']['male'] = d['value']['male'][0];
                d['value']['female'] = d['value']['female'][0];
            });
            
            graphicData.sort(sortValues);

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
        labelWidth = 95;
    } else {
        isMobile = false;
        labelWidth = 105;
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
        left: (labelWidth + LABEL_MARGIN)
    };
    var numBars = graphicData.length;
    var ticksX = 4;

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = ((GROUP_HEIGHT + GROUP_GAP) * numBars);

    var x = d3.scale.linear()
        .domain([ 0, d3.max(graphicData, function(d) {
            return Math.ceil(d['value']['male'] / 50) * 50; // round to next 50
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
            return d.toFixed(0);
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    // draw the legend
    var legend = graph.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(keyData)
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d['key']);
			});
    legend.append('b')
        .style('background-color', function(d) {
            return d['color'];
        });
    legend.append('label')
        .text(function(d) {
            return d['key'];
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

    // draw the bars
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(graphicData)
        .enter().append('rect')
            .attr('x', function(d){
                return x(d['value']['female']);
            })
            .attr('y', function(d, i) {
                return (i * (GROUP_HEIGHT + GROUP_GAP)) + ((GROUP_HEIGHT - BAR_HEIGHT) / 2);
            })
            .attr('width', function(d){
                return x(d['value']['male']) - x(d['value']['female']);
            })
            .attr('height', BAR_HEIGHT)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d['key']);
            });
    
    // draw the dots
    var dots = svg.append('g')
        .attr('class', 'dots male')
        .selectAll('circle')
            .data(graphicData)
        .enter().append('circle')
            .attr('cx', function(d) { 
                return x(d['value']['male']);
            })
            .attr('cy', function(d,i) { 
                return ((GROUP_HEIGHT + GROUP_GAP) * i) + (GROUP_HEIGHT / 2);
            })
            .attr('r', DOT_RADIUS)
            .attr('class', 'male')
            .attr('fill', colors['blue3']);

    var dots = svg.append('g')
        .attr('class', 'dots female')
        .selectAll('circle')
            .data(graphicData)
        .enter().append('circle')
            .attr('cx', function(d) { 
                return x(d['value']['female']);
            })
            .attr('cy', function(d,i) { 
                return ((GROUP_HEIGHT + GROUP_GAP) * i) + (GROUP_HEIGHT / 2);
            })
            .attr('r', DOT_RADIUS)
            .attr('class', 'female')
            .attr('fill', colors['red4']);

    // draw labels for each bar
    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + labelWidth + 'px; top: 2px; left: 0;')
        .selectAll('li')
            .data(graphicData)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + labelWidth + 'px; ';
                s += 'height: ' + GROUP_HEIGHT + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (GROUP_HEIGHT + GROUP_GAP)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                return classify(d['key']);
            })
            .append('span')
                .text(function(d) {
                    return d['key'];
                });
}


/*
 * HELPER FUNCTIONS
 */
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}
var sortValues = function(a,b) {
    if (a['value']['male'] > b['value']['male']) {
        return -1;
    }
    if (a['value']['male'] < b['value']['male']) {
        return 1;
    }
    return 0;
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);