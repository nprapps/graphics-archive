// global vars
var $graphic = null;
var pymChild = null;

var DOT_RADIUS = 2;
var GRAPHIC_DATA = null;
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;

var RECESSION_DATES = [
    { 'begin': '1990-07-01', 'end': '1991-03-01' },
    { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
];

var ANNOTATIONS = [
    { 'label': 'March 10, 2000', 'x': d3.time.format('%m/%d/%Y').parse('3/10/2000'), 'y': 5048.62, 'offset': 16 },
    { 'label': '5,048.62', 'x': d3.time.format('%m/%d/%Y').parse('3/10/2000'), 'y': 5048.62, 'offset': 3 },
    { 'label': 'April 23, 2015', 'x': d3.time.format('%m/%d/%Y').parse('4/23/2015'), 'y': 5056.06, 'offset': 16 },
    { 'label': '5,056.06', 'x': d3.time.format('%m/%d/%Y').parse('4/23/2015'), 'y': 5056.06, 'offset': 3 }
];

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var isMobile = false;
var isRendered = false;

// D3 objects
var svg = null;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * INITIALIZE
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        RECESSION_DATES.forEach(function(d) {
            d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
            d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
        });

        GRAPHIC_DATA_DAILY.forEach(function(d) {
            d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
            if (d['amt'] != null) {
                d['amt'] = +d['amt'];
            }
        });
        
        GRAPHIC_DATA_MONTHLY.forEach(function(d) {
            d['date'] = d3.time.format('%Y-%m-%d').parse(d['date']);
            if (d['amt'] != null) {
                d['amt'] = +d['amt'];
            }
        });
        
        GRAPHIC_DATA = GRAPHIC_DATA_MONTHLY;

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

    if (!isRendered) {
        $graphic.empty();
    }
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
    var aspectHeight;
    var aspectWidth;
    var color = d3.scale.ordinal()
        .range([ colors['teal4'], colors['yellow3'], colors['blue3'], colors['orange3'], colors['teal3'] ]);
    var graph = d3.select('#graphic');
    var margin = {
        top: 5,
        right: 15,
        bottom: 30,
        left: 40
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
        ticksY = 10;
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
        .tickFormat(function(d,i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
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
        .defined(function(d) { 
            return d['amt'] != null;
        })
        .interpolate('monotone')
        .x(function(d) {
            return x(d['date']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

    // assign a color to each line
    color.domain(d3.keys(GRAPHIC_DATA[0]).filter(function(key) {
        return key !== 'date';
    }));

    // parse data into columns
    var formattedData = {};
    for (var column in GRAPHIC_DATA[0]) {
        if (column == 'date') continue;
        formattedData[column] = GRAPHIC_DATA.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    // set the data domain
    x.domain(d3.extent(GRAPHIC_DATA, function(d) {
        return d['date'];
    }));

    y.domain([ 0, d3.max(d3.entries(formattedData), function(c) {
            return d3.max(c['value'], function(v) {
                var n = v['amt'];
                return Math.ceil(n/1500) * 1500; // round to next 1500
            });
        })
    ]);
    
    if (!isRendered) {
        // draw the legend
        var legend = graph.append('ul')
            .attr('class', 'key');
        
        var keyMonthly = legend.append('li')
            .attr('class', 'key-item monthly');
        keyMonthly.append('b')
            .style('background-color', colors['teal4']);
        keyMonthly.append('label')
            .text('Monthly averages');

        var keyDaily = legend.append('li')
            .attr('class', 'key-item daily');
        keyDaily.append('b')
            .style('background-color', colors['teal6']);
        keyDaily.append('label')
            .text('Daily closes');

        var keyRecession = legend.append('li')
            .attr('class', 'key-item recessions');
        keyRecession.append('b')
            .style('background-color', '#f1f1f1');
        keyRecession.append('label')
            .text('Economic recessions');


        // draw the chart
        svg = graph.append('svg')
            .attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom']);
        
        var svgBounds = svg.append('g')
            .attr('class', 'bounds')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

        // recession bars
        svgBounds.append('g')
            .attr('class', 'recession')
            .selectAll('rect')
            .data(RECESSION_DATES)
            .enter()
                .append('rect')
                    .attr('x', function(d) {
                        return x(d['begin']);
                    })
                    .attr('width', function(d) {
                        return x(d['end']) - x(d['begin']);
                    })
                    .attr('y', 0)
                    .attr('height', height)
                    .attr('fill', '#f1f1f1');

        // x-axis (bottom)
        svgBounds.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

        // y-axis (left)
        svgBounds.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

        // x-axis gridlines
        svgBounds.append('g')
            .attr('class', 'x grid')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxisGrid()
                .tickSize(-height, 0, 0)
                .tickFormat('')
            );

        // y-axis gridlines
        svgBounds.append('g')
            .attr('class', 'y grid')
            .call(yAxisGrid()
                .tickSize(-width, 0, 0)
                .tickFormat('')
            );

        // draw the daily dots
        svgBounds.append('g')
            .attr('class', 'dots')
            .selectAll('circle')
                .data(GRAPHIC_DATA_DAILY)
            .enter().append('circle')
                .filter(function(d) {
                    return d['amt'] != null;
                })
                .attr('cx', function(d) { 
                    return x(d['date']);
                })
                .attr('cy', function(d) { 
                    return y(d['amt']);
                })
                .attr('r', DOT_RADIUS)
                .attr('fill', 'rgba(197,223,223,.5)');
    
        // draw the line(s)
        svgBounds.append('g')
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
        
        // labels
        var annotations = svgBounds.append('g')
            .attr('class', 'annotations')
            .selectAll('text')
                .data(ANNOTATIONS)
            .enter()
                .append('text')
                    .attr('dx', function(d) {
                        return x(d['x']);
                    })
                    .attr('dy', function(d) {
                        return y(d['y']) - d['offset'];
                    })
                    .attr('text-anchor', 'end')
                    .text(function(d) {
                        return d['label'];
                    });

        isRendered = true;
    
    // everything's already drawn we just need to update it
    } else {
        svg.attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom']);
        
        svg.selectAll('.y.axis')
            .call(yAxis);

        svg.selectAll('.x.axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

        svg.selectAll('.y.grid')
            .call(yAxisGrid()
                .tickSize(-width, 0, 0)
                .tickFormat('')
            );

        svg.selectAll('.x.grid')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxisGrid()
                .tickSize(-height, 0, 0)
                .tickFormat('')
            );
        
        d3.select('.recession')
            .selectAll('rect')
                .attr('x', function(d) {
                    return x(d['begin']);
                })
                .attr('width', function(d) {
                    return x(d['end']) - x(d['begin']);
                })
                .attr('y', 0)
                .attr('height', height);

        
        d3.select('.dots')
            .selectAll('circle')
                .attr('cx', function(d) { 
                    return x(d['date']);
                })
                .attr('cy', function(d) { 
                    return y(d['amt']);
                });
        
        d3.select('.lines')
            .selectAll('path')
                .attr('d', function(d) {
                    return line(d['value']);
                });

        d3.select('.annotations')
            .selectAll('text')
                .attr('dx', function(d) {
                    return x(d['x']);
                })
                .attr('dy', function(d) {
                    return y(d['y']) - d['offset'];
                })
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