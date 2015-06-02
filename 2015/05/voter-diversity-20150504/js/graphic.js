// global vars
var $graphic = null;
var pymChild = null;

// var GRAPHIC_DATA = null; <-- defined in child_template.html
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_HEIGHT = 30;

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

        // parse through the data
        colorD3 = d3.scale.ordinal()
            .range([ COLORS['teal3'], COLORS['teal6'] ])
            .domain(d3.keys(GRAPHIC_DATA[0]).filter(function(key) {
                return key !== 'year';
            }));

        GRAPHIC_DATA.forEach(function(d) {
            var y0 = 0;
            d['year'] = d3.time.format('%Y').parse(d['year'].toString());
            d['values'] = colorD3.domain().map(function(name) {
                if (d[name] != null) {
                    d[name] = +d[name];
                }
                return { 
                    name: name, 
                    y0: y0, 
                    y1: y0 += +d[name], 
                    val: +d[name],
                    'year': fmtYearFull(d['year'])
                };
            });
            d['total'] = d['values'][d['values'].length - 1]['y1'];
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
            return d['year'];
        }));

    var y = d3.scale.linear()
        .rangeRound([height, 0])
        .domain([ 0, d3.max(GRAPHIC_DATA, function(d) {
            return Math.ceil(d['total']/50) * 50; // round to next 50
        }) ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            var y;
            if (isMobile) {
                y = '\u2019' + fmtYearAbbrev(d);
            } else {
                y = fmtYearFull(d);
            }
            if (fmtYearFull(d) == '2016') {
                y += '*'
            }
            return y;
        });

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d) + '%';
        });

    var y_axis_grid = function() { return yAxis; }

    // draw the legend
    var legend = d3.select('#graphic').append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(GRAPHIC_DATA[0]['values'])
            .enter().append('li')
                .attr('class', function(d, i) {
                    return 'key-item key-' + i + ' ' + classify(d['name']);
                });
    legend.append('b')
        .style('background-color', function(d,i) {
            return colorD3(d['name']);
        })
    legend.append('label')
        .text(function(d) {
            return d['name'];
        });

    // draw the chart itself
    var svg = d3.select('#graphic').append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // projected shaded area
    var hatchWhite = svg.append('defs')
      .append('pattern')
        .attr('id', 'hatchWhite')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
      .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', COLORS['teal3'])
        .attr('stroke-width', 1);   
    var hatchNonWhite = svg.append('defs')
      .append('pattern')
        .attr('id', 'hatchNonWhite')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
      .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', COLORS['teal6'])
        .attr('stroke-width', 1);   

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

    var bars = svg.selectAll('.bars')
        .data(GRAPHIC_DATA)
        .enter().append('g')
            .attr('class', function(d) {
                return 'bar y-' + fmtYearFull(d['year']);
            })
            .attr('transform', function(d) {
                return 'translate(' + x(d['year']) + ',0)';
            });

    bars.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('width', x.rangeBand())
            .attr('x', function(d) {
                return x(d['x0']);
            })
            .attr('y', function(d) {
                return y(d['y1']);
            })
            .attr('height', function(d) {
                return y(d['y0']) - y(d['y1']);
            })
            .style('fill', function(d,i) {
//                 console.log(d);
//                 if (d['year'] == '2016' && i == 1) {
//                     return 'url(#hatchNonWhite)';
//                 } else if (d['year'] == '2016' && i == 0) {
//                     return 'url(#hatchWhite)';
//                 } else {
                    return colorD3(d['name']);
//                 }
            })
            .attr('class', function(d) {
                return classify(d['name']);
            });

    if (!isMobile) {
        svg.append('g')
            .attr('class', 'value')
            .selectAll('text')
                .data(GRAPHIC_DATA)
            .enter().append('text')
                .attr('x', function(d, i) {
                    return x(d['year']) + (x.rangeBand() / 2);
                })
                .attr('y', function(d) {
                    if (height - y(d['values'][0]['val']) > VALUE_MIN_HEIGHT) {
                        return y(d['values'][0]['val']) + 15;
                    } else {
                        return y(d['values'][0]['val']) - 6;
                    }
                })
                .attr('text-anchor', 'middle')
                .attr('class', function(d) {
                    var c = classify('y-' + fmtYearFull(d['year']));
                    if (height - y(d['values'][0]['val']) > VALUE_MIN_HEIGHT) {
                        c += ' in';
                    } else {
                        c += ' out';
                    }
                   return c;
                })
                .text(function(d) {
                    return d['values'][0]['val'].toFixed(0) + '%';
                });
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
