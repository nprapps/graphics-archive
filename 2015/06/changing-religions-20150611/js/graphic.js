// Configuration
var GRAPHIC_ID = '#graphic';
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRAPHIC_HEIGHT = 300;
var MOBILE_THRESHOLD = 280;

var GRAPHIC_MARGIN = {
    top: 20,
    right: 185,
    bottom: 20,
    left: 40
};

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

// Globals
var graphicElement = null;
var pymChild = null;
var isMobile = false;
var activeState = "South Carolina";

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    graphicElement = d3.select(GRAPHIC_ID);

    if (Modernizr.svg) {
        DATA.forEach(function(d) {
            DATA['pct2007'] = +DATA['pct2007'];
            DATA['pct2014'] = +DATA['pct2014'];
        });

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Render the graphic(s)
 */
var render = function(containerWidth) {
    // Fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        GRAPHIC_MARGIN['left'] = 28;
        GRAPHIC_MARGIN['right'] = 120;
    } else {
        isMobile = false;
        GRAPHIC_MARGIN['left'] = 40;
        GRAPHIC_MARGIN['right'] = 185;
    }

    // Clear out existing graphic (for re-drawing)
    graphicElement.html('');

    drawGraph(containerWidth, GRAPHIC_ID, DATA);

    // Resize iframe to fit
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, id, data) {
    var graph = d3.select(id);

    var ticksX = 2;
    var ticksY = 10;

    // define chart dimensions
    var width = graphicWidth - GRAPHIC_MARGIN['left'] - GRAPHIC_MARGIN['right'];
    // if (width > CHART_MAX_WIDTH) {
    //     width = CHART_MAX_WIDTH;
    // }
    var height = GRAPHIC_HEIGHT - GRAPHIC_MARGIN['top'] - GRAPHIC_MARGIN['bottom'];

    var x = d3.scale.linear()
        .range([ 0, width ])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // set the data domain
    x.domain([2007, 2014]);
    y.domain([3, 28]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues([ 2007, 2014 ])
        .tickFormat(function(d) {
            return d;
        });

    var xAxisTop = d3.svg.axis()
        .scale(x)
        .orient('top')
        .tickValues([ 2007, 2014 ])
        .tickFormat(function(d) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .tickValues(y.domain())
        .tickFormat(function(d) {
            return d + '%';
        });

    // draw the chart
    var svg = graph.append('svg')
		.attr('width', width + GRAPHIC_MARGIN['left'] + GRAPHIC_MARGIN['right'])
		.attr('height', height + GRAPHIC_MARGIN['top'] + GRAPHIC_MARGIN['bottom'])
        .append('g')
            .attr('transform', 'translate(' + GRAPHIC_MARGIN['left'] + ',' + GRAPHIC_MARGIN['top'] + ')');

    // x-axis (top)
    svg.append('g')
        .attr('class', 'x axis')
        .call(xAxisTop);

    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // draw the line(s)
    svg.append('g')
        .attr('class', 'lines')
        .selectAll('line')
        .data(data)
        .enter()
        .append('line')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['group']);
            })
            .attr('x1', x(2007))
            .attr('y1', function(d) {
                return y(d['pct2007']);
            })
            .attr('x2', x(2014))
            .attr('y2', function(d) {
                return y(d['pct2014']);
            });

    svg.select('line.unaffiliated').moveToFront();

    var dots = svg.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
            .attr('cx', x(2007))
            .attr('cy', function(d) {
                return y(d['pct2007']);
            })
            .attr('r', 3)
            .attr('class', function(d, i) {
                return classify(d['group']);
            })

    var dots = svg.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
            .attr('cx', x(2014))
            .attr('cy', function(d) {
                return y(d['pct2014']);
            })
            .attr('r', 3)
            .attr('class', function(d, i) {
                return classify(d['group']);
            })

    var values = svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(data)
        .enter()
        .append('text')
            .attr('x', x(2007))
            .attr('y', function(d) {
                return y(d['pct2007']);
            })
            .attr('text-anchor', 'end')
            .attr('dx', -6)
            .attr('dy', 3)
            .attr('class', function(d, i) {
                return classify(d['group']);
            })
            .text(function(d) {
                var val = +d['pct2007'];
                if (isMobile) {
                    return val.toFixed(0) + '%';
                } else {
                    return val + '%';
                }
            });

    var values = svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(data)
        .enter()
        .append('text')
            .attr('x', x(2014))
            .attr('y', function(d) {
                return y(d['pct2014']);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', 6)
            .attr('dy', function(d) {
                if (isMobile && d['group'] == 'Catholic') {
                    return 9;
                } else {
                    return 3;
                }
            })
            .attr('class', function(d, i) {
                return classify(d['group']);
            })
            .text(function(d) {
                var val = +d['pct2014'];
                if (isMobile) {
                    return val.toFixed(0) + '%';
                } else {
                    return val + '%';
                }
            });

    svg.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(data)
        .enter()
        .append('text')
            .attr('x', x(2014))
            .attr('y', function(d) {
                return y(d['pct2014']);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', function(d) {
                if (isMobile) {
                    return 32;
                } else {
                    return 42;
                }
            })
            .attr('dy', function(d) {
                if (isMobile && d['group'] == 'Catholic') {
                    return 9;
                } else {
                    return 3;
                }
            })
            .attr('class', function(d, i) {
                return classify(d['group']);
            })
            .text(function(d) {
                var label = d['group'] + ' (';

                if (d['change'] > 0) {
                    label += '+';
                }

                label += d['change'] + ')';

                return label;
            })
            .call(wrapText, (GRAPHIC_MARGIN['right'] - 32));
}

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/* via http://bl.ocks.org/mbostock/7555321 */
var wrapText = function(text, width) {
    text.each(function() {
        var text = d3.select(this)
        var words = text.text().split(/\s+/).reverse();
        var word = null;
        var line = [];
        var lineNumber = 0;
        var lineHeight = 16;
        var x = text.attr('x');
        var y = text.attr('y');
        var dx = parseFloat(text.attr('dx'));
        var dy = parseFloat(text.attr('dy'));
        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];
                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', ++lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
