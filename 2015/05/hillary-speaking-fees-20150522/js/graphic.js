// global vars
var $graphic = null;
var pymChild = null;

var BAR_HEIGHT = 20;
var BAR_GAP = 5;
var GRAPHIC_DATA_URL = 'data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var LABEL_MARGIN = 6;
var LABEL_WIDTH = 115;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_WIDTH = 30;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

var graphicData;
var isMobile = false;

/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        graphicData = GRAPHIC_DATA;

        // graphicData.forEach(function(d) {
        //     d['amt'] = +d['amt'];
        // });

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
    var graph = d3.select('#graphic');
    var margin = {
        top: 0,
        right: 30,
        bottom: 20,
        left: (LABEL_WIDTH + LABEL_MARGIN)
    };
    var numBars = graphicData.length;
    var ticksX = isMobile ? 4 : 6;

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = ((BAR_HEIGHT + BAR_GAP) * numBars);

    var x = d3.scale.linear()
        .domain([ 0, d3.max(graphicData, function(d) {
            return Math.ceil(d['max'] / 100000) * 100000;
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
            if (isMobile && d > 0) {
                return (d / 1000000) + ' Million'
            }

            return fmtComma(d);
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    // draw the legend
    var legend = graph.append('ul')
        .attr('class', 'key')
        .selectAll('g')
        .data([{
            'label': 'Least possibly earned',
            'color': '#17807E'
        }, {
            'label': 'Most possibly earned',
            'color': '#8BC0BF'
        }])
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d['label']);
            });
    legend.append('b')
        .style('background-color', function(d) {
        	return d['color'];
        });
    legend.append('label')
        .text(function(d) {
            return d['label'];
        });

    var wrapper = graph.append('div')
        .attr('class', 'wrapper');

    // draw the chart
    var svg = wrapper.append('svg')
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
    // svg.append('g')
    //     .attr('class', 'bars')
    //     .selectAll('rect')
    //         .data(graphicData)
    //     .enter().append('rect')
    //         .attr('x', function(d, i) {
    //             return x(d['min']);
    //         })
    //         .attr('y', function(d, i) {
    //             return i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2 - 1 / 2);
    //         })
    //         .attr('width', function(d){
    //             return x(d['max']) - x(d['min']);
    //         })
    //         .attr('height', isMobile ? 1 : 2)
    //         .attr('class', function(d, i) {
    //             return 'bar-' + i + ' ' + classify(d['label']);
    //         });

    // draw the bars
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('line')
            .data(graphicData)
        .enter().append('line')
            .attr('x1', function(d, i) {
                return x(d['min']);
            })
            .attr('x2', function(d, i) {
                return x(d['max']);
            })
            .attr('y1', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2);
            })
            .attr('y2', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2);
            })
            .attr('stroke-width', isMobile ? 1 : 2);

    // min values
    svg.append('g')
        .attr('class', 'mins')
        .selectAll('circle')
            .data(graphicData)
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return x(d['min']);
            })
            .attr('cy', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2);
            })
            .attr('r', isMobile ? 3 : 5)

    // max values
    svg.append('g')
        .attr('class', 'maxs')
        .selectAll('circle')
            .data(graphicData)
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return x(d['max']);
            })
            .attr('cy', function(d, i) {
                var y = i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT / 2);

                return y;
            })
            .attr('r', isMobile ? 3 : 5)

    // draw labels for each bar
    var labels = wrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + LABEL_WIDTH + 'px; top: ' + margin['top'] + 'px; left: 0;')
        .selectAll('li')
            .data(graphicData)
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
                .text(function(d) {
                    return d['label'];
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
