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
var COLOR_BINS = [ -4, -2, 0, 2, 4, 6, 8, 10 ];
var COLOR_RANGE = [COLORS['red5'], '#ccc', COLORS['blue5'], COLORS['blue4'], COLORS['blue3'], COLORS['blue2']];
var isMobile = false;
var binnedData = [];
var MAX_BINS = 22;


/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // load the data
        colorD3 = d3.scale.ordinal()
            .domain(COLOR_BINS) // bins
            .range(COLOR_RANGE);

        var numBins = COLOR_BINS.length - 1;
        COLOR_BINS.forEach(function(b, i) {
            if (i < numBins) {
                binnedData[i] = [];
            }
        });

        GRAPHIC_DATA.forEach(function(d) {
            if (d['change_point'] != null) {
                var change = +d['change_point'];
                var state = null;

                STATE_NAMES.forEach(function(s, i) {
                    if (s['name'] == d['state']) {
                        state = s['usps'];
                    }
                });

                COLOR_BINS.forEach(function(b, i) {
                    if (i < numBins) {
                        if (change >= COLOR_BINS[i] && change < COLOR_BINS[i + 1]) {
                            binnedData[i].unshift(state);
                        }
                    }
                });

            }
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
    var margin = {
        top: 20,
        right: 10,
        bottom: 20,
        left: 10
    };
    var binHeight = 20;
    if (isMobile) {
        binHeight = 15;
    }
    var ticksY = 4;
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = MAX_BINS * binHeight;

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain([ -4, -2, 0, 2, 4, 6, 8 ]);

    var y = d3.scale.linear()
        .rangeRound([height, 0])
        .domain([ 0, MAX_BINS ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .outerTickSize(0)
        .tickFormat(function(d) {
            if (d > 0) {
                return '+' + d + '%';
            }

            if (d < 0) {
                return d + '%';
            }

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

            transform.translate[0] = x(8) + x.rangeBand();
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
        .text('+10%');

    var bars = svg.selectAll('.bar')
        .data(binnedData)
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
        
    svg.append('text')
        .attr('class', 'label-top')
        .attr('x', x(0))
        .attr('dx', -15)
        .attr('text-anchor', 'end')
        .attr('y', -10)
        .html(LBL_DECLINED);

    svg.append('text')
        .attr('class', 'label-top')
        .attr('x', x(0))
        .attr('dx', 5)
        .attr('text-anchor', 'begin')
        .attr('y', -10)
        .html(LBL_IMPROVED);
    
    svg.append('line')
        .attr('class', 'axis-0')
        .attr('x1', x(0) - ((x.rangeBand() * .1) / 2))
        .attr('y1', -margin['top'])
        .attr('x2', x(0) - ((x.rangeBand() * .1) / 2))
        .attr('y2', height);
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
