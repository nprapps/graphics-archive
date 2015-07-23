// global vars
var $graphic = null;
var pymChild = null;

// var GRAPHIC_DATA = null;
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

var colorD3;
var COLOR_BINS = [ 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60 ];
var COLOR_RANGE = [COLORS['red5'], '#ccc', COLORS['blue5'], COLORS['blue4'], COLORS['blue3'], COLORS['blue2']];
var isMobile = false;
var binnedData = [];
var binnedDataMobile = [];
var MAX_IN_BINS = null;


/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        // load the data
        colorD3 = d3.scale.ordinal()
            .domain(COLOR_BINS) // bins
            .range(COLOR_RANGE);

        var numBins = COLOR_BINS.length - 1;
        COLOR_BINS.forEach(function(b, i) {
            if (i < numBins) {
                binnedData[i] = [];
                binnedDataMobile[i] = [];
            }
        });

        GRAPHIC_DATA.forEach(function(d) {
            if (d['Total'] != null) {
                var change = +d['Total'];
                var state = d['Country'];
                var stateMobile = d['Abbreviation'];

                COLOR_BINS.forEach(function(b, i) {
                    if (i < numBins) {
                        if (change >= COLOR_BINS[i] && change < COLOR_BINS[i + 1]) {
                            binnedData[i].unshift(state);
                            binnedDataMobile[i].unshift(stateMobile);
                        }
                    }
                });

            }
        });

        MAX_IN_BINS = 0;
        _.each(binnedData, function(d,i) {
            if (d.length > MAX_IN_BINS) {
                MAX_IN_BINS = d.length;
            }
        })

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
        top: 20,
        right: 10,
        bottom: 20,
        left: 10
    };
    var binHeight = 20;
    var data = binnedData;
    if (isMobile) {
        binHeight = 15;
        data = binnedDataMobile;
    }
    var ticksY = 4;
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = MAX_IN_BINS * binHeight;

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain([ 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 ]);

    var y = d3.scale.linear()
        .rangeRound([height, 0])
        .domain([ 0, MAX_IN_BINS ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .outerTickSize(0)
        .tickFormat(function(d) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
        });

    var y_axis_grid = function() { return yAxis; }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    // draw the chart itself
    var svg = containerElement.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0)
            .tickFormat('')
        );

    svg.selectAll('.x.axis .tick')
        .attr('transform', function() {
            var el = d3.select(this);
            var transform = d3.transform(el.attr('transform'));

            transform.translate[0] = transform.translate[0] - (x.rangeBand() / 2) - ((x.rangeBand() * .1) / 2);
            transform.translate[1] = 3;

            return transform.toString();
        })

    // Add tick on 10 line
    var tick = svg.select('.x.axis')
        .append('g')
        .attr('class', 'tick')
        .attr('transform', function() {
            var transform = d3.transform();

            transform.translate[0] = x(55) + x.rangeBand();
            transform.translate[1] = 3;

            return transform.toString();
        })

    tick.append('line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', 6)

    tick.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', 0)
        .attr('y', 9)
        .attr('dy', '0.71em')
        .text('60');

    var bars = svg.selectAll('.bar')
        .data(data)
        .enter().append('g')
            .attr('class', function(d,i) {
                return 'bar bin-' + i;
            })
            .attr('transform', function(d, i) {
                return 'translate(' + x(COLOR_BINS[i]) + ',0)';
            });

    bars.selectAll('rect')
        .data(function(d) {
            return d3.entries(d);
        })
        .enter().append('rect')
            .attr('width', x.rangeBand())
            .attr('x', 0)
            .attr('y', function(d,i) {
                return height - (binHeight * (i + 1));
            })
            .attr('height', function(d) {
                return binHeight - 1;
            })
            .attr('class', function(d) {
                return classify(d['value']);
            });

    bars.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(function(d) {
                return d3.entries(d);
            })
        .enter().append('text')
            .attr('x', (x.rangeBand() / 2))
            .attr('y', function(d,i) {
                return height - (binHeight * (i + 1));
            })
            .attr('dy', (binHeight / 2) + 4)
            .attr('text-anchor', function(d, i) {
				return 'middle';
            })
            .text(function(d) {
                return d['value'];
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
