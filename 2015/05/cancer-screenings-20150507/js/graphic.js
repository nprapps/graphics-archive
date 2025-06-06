// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

var BAR_HEIGHT = 45;
var BAR_GAP = 5;
// var GRAPHIC_DATA = null; <!-- defined in child_template.html
var GRAPHIC_DEFAULT_WIDTH = 600;
var LABEL_MARGIN = 6;
var LABEL_WIDTH = 100;
var MOBILE_THRESHOLD = 500;

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
        graphicD3 = d3.select('#graphic');

        // process the data
        colorD3 = d3.scale.ordinal()
            .range([ COLORS['teal3'], COLORS['teal6'] ])
            .domain(d3.keys(GRAPHIC_DATA[0]).filter(function(d) {
                return d != 'label' && d != 'audience' && d != '2020_label';
            }));

        GRAPHIC_DATA.forEach(function(d) {
            var x0 = 0;
            d['values'] = colorD3.domain().map(function(name) {
                return {
                    name: name,
                    x0: x0,
                    x1: x0 += +d[name],
                    val: d[name]
                };
            });
        });

        // setup pym
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
    var margin = {
        top: 0,
        right: 15,
        bottom: 30,
        left: (LABEL_WIDTH + LABEL_MARGIN)
    };
    var numBars = GRAPHIC_DATA.length;
    var ticksX;

    if (isMobile) {
        ticksX = 2;
    } else {
        ticksX = 4;
    }

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = ((BAR_HEIGHT + BAR_GAP) * numBars);

    var x = d3.scale.linear()
        .domain([ 0, 100 ])
        .rangeRound([0, width]);

    var y = d3.scale.ordinal()
        .domain(GRAPHIC_DATA.map(function(d) {
            return d['values'];
        }))
        .rangeRoundBands([0, height], .1);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d + '%';
        });

    var x_axis_grid = function() { return xAxis; }

    // draw the legend
    var legend = graphicD3.append('ul')
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
    var chart = graphicD3.append('div')
        .attr('class', 'chart');

    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    var group = svg.selectAll('.group')
        .data(GRAPHIC_DATA)
        .enter().append('g')
            .attr('class', function(d) {
                return 'group ' + classify(d['label']);
            })
            .attr('transform', function(d,i) {
                return 'translate(0,' + (i * (BAR_HEIGHT + BAR_GAP)) + ')';
            });

    group.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('height', BAR_HEIGHT)
            .attr('x', function(d) {
                return x(d['x0']);
            })
            .attr('width', function(d) {
                return x(d['x1']) - x(d['x0']);
            })
            .style('fill', function(d) {
                return colorD3(d['name']);
            })
            .attr('class', function(d) {
                return classify(d['name']);
            });

    group.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(function(d) {
                return d['values'];
            })
        .enter().append('text')
            .attr('x', function(d, i) {
				return x(d['x1']);
            })
            .attr('dx', function(d, i) {
				return -6;
            })
            .attr('dy', (BAR_HEIGHT / 2) + 4)
            .attr('text-anchor', function(d, i) {
				return 'end';
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .text(function(d) {
                if (d['name'] != '2020 goal') {
                    if (d['val'] > 0) {
                        var v = d['val'] + '%';
                        return v;
                    }
                }
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
                return classify(d['label']);
            })
            .append('span')
                .html(function(d) { 
                    return d['label'];
                })
            .append('i')
                .html(function(d) {
                    return d['audience'];
                });

    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
