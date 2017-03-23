// Configuration
var GRAPHIC_ID = '#graphic';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;
var VALUE_MIN_HEIGHT = 20;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

// Globals
var $graphic = null;
var pymChild = null;
var graphicData = null;
var isMobile = false;

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    $graphic = $(GRAPHIC_ID);

    graphicData = GRAPHIC_DATA;

    pymChild = new pym.Child({
        renderCallback: render
    });
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
    } else {
        isMobile = false;
    }

    // Clear out existing graphic (for re-drawing)
    $graphic.empty();

    drawGraph(containerWidth, GRAPHIC_ID, graphicData);

    // Resize iframe to fit
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, container, graphicData) {
    var aspectHeight = 1;
    var aspectWidth = 2;

    if (isMobile) {
        aspectHeight = 1;
        aspectWidth = 2;
    }

    var margin = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 40
    };

    // console.log(GRAPHIC_DATA);

    var ticksY = 4;
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((width * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(graphicData.map(function (d) {
            return d['date'];
        }));

    var y = d3.scale.linear()
        .domain([ 0, d3.max(graphicData, function(d) {
            return Math.ceil(+d['amt'] / 500) * 500; // round to next 50
        }) ])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            return +d;
        });

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
        });

    var y_axis_grid = function() { return yAxis; }

    var containerElement = d3.select(container);

    containerElement.html('');

    // draw the chart itself
    var svg = containerElement
        .append('svg')
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
            .data(graphicData)
        .enter().append('rect')
            .attr('x', function(d) {
                return x(d['date']);
            })
            .attr('y', function(d) {
                return y(+d['amt']);
            })
            .attr('width', x.rangeBand())
            .attr('height', function(d){
                return y(0) - y(+d['amt']);
            })
            .attr('class', function(d) {
                return 'bar bar-' + d['date'];
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
            .data(graphicData)
        .enter().append('text')
            .attr('x', function(d, i) {
                return x(d['date']) + (x.rangeBand() / 2);
            })
            .attr('y', function(d) {
                if (height - y(+d['amt']) > VALUE_MIN_HEIGHT) {
                    return y(+d['amt']) + 15;
                } else {
                    return y(+d['amt']) - 6;
                }
            })
            .attr('text-anchor', 'middle')
            .attr('class', function(d) {
                var c = classify('y-' + d['label']);
                 if (height - y(+d['amt']) > VALUE_MIN_HEIGHT) {
                    c += ' in';
                } else {
                    c += ' out';
                }
               return c;
            })
            .text(function(d) {
                return fmtComma(+d['amt']);
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
