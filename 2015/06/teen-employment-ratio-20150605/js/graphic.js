// global vars
var $graphic = null;
var pymChild = null;

// var GRAPHIC_DATA = null;
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_HEIGHT = 20;

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
            d['amt'] = +d['amt'];
            d['date'] = d3.time.format('%Y').parse(d['date']);
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
    var aspectHeight = 9;
    var aspectWidth = 16;
    if (isMobile) {
        aspectHeight = 3;
        aspectWidth = 4;
    }
    var margin = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 37
    };
    var ticksY = 4;
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((width * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(GRAPHIC_DATA.map(function (d) {
            return d['date'];
        }));

    var y = d3.scale.linear()
        .domain([ 0, 100 ])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            var y;
            if (isMobile && i%2 == 0) {
                y = '\u2019' + fmtYearAbbrev(d);
            } else if (!isMobile) {
                y = fmtYearFull(d);
            }
            return y;
        });

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d + '%';
        });

    var y_axis_grid = function() { return yAxis; }

    // draw the chart itself
    var svg = d3.select('#graphic').append('svg')
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
        .attr('class', 'bg')
        .selectAll('rect')
            .data(GRAPHIC_DATA)
        .enter().append('rect')
            .attr('x', function(d) {
                return x(d['date']);
            })
            .attr('y', 0)
            .attr('width', x.rangeBand())
            .attr('height', height);

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(GRAPHIC_DATA)
        .enter().append('rect')
            .attr('x', function(d) {
                return x(d['date']);
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
                return 'bar bar-' + fmtYearAbbrev(d['date']);
            });

    svg.append('line')
        .attr('class', 'y grid grid-0')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(0))
        .attr('y2', y(0));

    if (!isMobile) {
        svg.append('g')
            .attr('class', 'value')
            .selectAll('text')
                .data(GRAPHIC_DATA)
            .enter().append('text')
                .attr('x', function(d, i) {
                    return x(d['date']) + (x.rangeBand() / 2);
                })
                .attr('y', function(d) {
                    if (height - y(d['amt']) > VALUE_MIN_HEIGHT) {
                        return y(d['amt']) + 15;
                    } else {
                        return y(d['amt']) - 6;
                    }
                })
                .attr('text-anchor', 'middle')
                .attr('class', function(d) {
                    var c = classify('y-' + d['label']);
                     if (height - y(d['amt']) > VALUE_MIN_HEIGHT) {
                        c += ' in';
                    } else {
                        c += ' out';
                    }
                   return c;
                })
                .text(function(d) {
                    return d['amt'].toFixed(0) + '%';
                });
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
