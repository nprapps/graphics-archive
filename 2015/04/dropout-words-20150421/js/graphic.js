// global vars
var $graphic = null;
var $graphic2 = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var keyColors = {
    'juvenile delinquent': colors['red3'],
    'at-risk youth': colors['yellow3'],
    'dropout': colors['blue3'],
    'superpredator': colors['orange3']
}

var graphicData = null;
var graphicData2 = null;
var isMobile = false;

/*
 * INITIALIZE
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        $graphic2 = $('#graphic2');

        d3.csv(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = data;

            // Create data for second chart
            graphicData2 = [];

            graphicData.forEach(function(d) {
                data2 = {};

                for (var attr in d) {
                    if (attr == 'dropout') {
                        continue;
                    }

                    data2[attr] = d[attr];
                }

                graphicData2.push(data2);
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

    // clear out existing graphics
    $graphic.empty();
    $graphic2.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(containerWidth, '#graphic', graphicData, 0.000002, 0.000002, 3);
    drawGraph(containerWidth, '#graphic2', graphicData2, 0.0000002, 0.00000025, 7);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, container, data, yMax, yMaxMobile, labelBump) {
    var aspectHeight;
    var aspectWidth;
    var graph = d3.select(container);
    var margin = {
    	top: 5,
    	right: isMobile ? 15 : 120,
    	bottom: 30,
    	left: 68
    };
    var ticksX;
    var ticksY;

    // params that depend on the container width
    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
        ticksX = 5;
        ticksY = 5;
    } else {
        aspectWidth = 16;
        aspectHeight = 9;
        ticksX = 10;
        ticksY = 6;
    }

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((graphicWidth * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];

    var x = d3.scale.linear()
        .range([ 0, width ])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d,i) {
            return d;
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            return (d * 100).toFixed(6) + '%';
        });

    var yAxisGrid = function() {
        return yAxis;
    }

    // define the line(s)
    var line = d3.svg.line()
        .interpolate('basis')
        .x(function(d) {
            return x(d['year']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

    // parse data into columns
    var formattedData = {};
    for (var column in data[0]) {
        if (column == 'year') {
            continue;
        }

        formattedData[column] = data.map(function(d) {
            return { 'year': d['year'], 'amt': d[column] };
        });
    }

    // set the data domain
    x.domain(d3.extent(data, function(d) {
        return d['year'];
    }));

    y.domain([ 0, isMobile ? yMaxMobile : yMax ]);

    // draw the legend
    if (isMobile) {
        var legend = graph.append('ul')
    		.attr('class', 'key')
    		.selectAll('g')
    			.data(d3.entries(formattedData))
    		.enter().append('li')
    			.attr('class', function(d, i) {
    				return 'key-item key-' + i + ' ' + classify(d['key']);
    			});
        legend.append('b')
            .style('background-color', function(d) {
                return keyColors[d['key']];
            });
        legend.append('label')
            .text(function(d) {
                return d['key'].charAt(0).toUpperCase() + d['key'].slice(1);
            });
    }

    // draw the chart
    var svg = graph.append('svg')
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
                return keyColors[d['key']];
            })
            .attr('d', function(d) {
                return line(d['value']);
            })

    if (!isMobile) {
        svg.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(d3.entries(formattedData))
            .enter()
            .append('text')
                .attr('transform', function(d) {
                    var lastYear = d['value'][d['value'].length - 1]['year']
                    var lastValue = d['value'][d['value'].length - 1]['amt'];

                    var xTranslate = x(lastYear) + 5;
                    var yTranslate = y(lastValue) + 3;

                    return 'translate(' + xTranslate + ',' + yTranslate + ')';
                })
                .attr('dy', function(d) {
                    if (d['key'] == 'at-risk youth') {
                        return -10;
                    } else if (d['key'] == 'juvenile delinquent') {
                        return 3;
                    } else if (d['key'] == 'superpredator') {
                        return 2;
                    }
                })
                .attr('fill', function(d) {
                    return keyColors[d['key']];
                })
                .text(function(d) {
                    return d['key'].charAt(0).toUpperCase() + d['key'].slice(1);
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
