// global vars
var $graphic = null;
var pymChild = null;

// var GRAPHIC_DATA = null; <!-- defined in child_template.html
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 550;
var VALUE_MIN_HEIGHT = 20;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

var isMobile = false;
var annotations = [];

/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        GRAPHIC_DATA.forEach(function(d) {
            d['amt'] = +d['debt_pct_gdp'];
            d['date'] = d3.time.format('%B %d, %Y').parse(d['year']);

            if (d['abbr'] == 'PR' || d['abbr'] == 'GU' || d['abbr'] == 'HI' || d['abbr'] == 'NE') {
                var abbr = d['abbr'];
                annotations.push({ 'label': d['label'], 
                                      'abbr': d['abbr'],
                                      'pct': d['amt'],
                                      'date': fmtYearFull(d['date']) });
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
    var aspectHeight = 9;
    var aspectWidth = 16;
    if (isMobile) {
        aspectHeight = 3;
        aspectWidth = 4;
    }
    var margin = {
        top: 5,
        right: 5,
        bottom: 30,
        left: 37
    };
    if (isMobile) {
        margin['left'] = 0;
        margin['bottom'] = 5;
    }
    var ticksY = 4;
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((width * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];

    var x = d3.scale.ordinal()
        .rangeBands([0, width], .1)
        .domain(GRAPHIC_DATA.map(function (d) {
            return d['abbr'];
        }));

    var y = d3.scale.linear()
        .domain([ 0, d3.max(GRAPHIC_DATA, function(d) {
            return Math.ceil(d['amt']/50) * 50; // round to next 50
        }) ])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            return GRAPHIC_DATA[i]['abbr'];
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

    if (!isMobile) {
        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);
    }

    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0)
            .tickFormat('')
        );

    var bars = svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(GRAPHIC_DATA)
        .enter().append('rect')
            .attr('x', function(d) {
                return x(d['abbr']);
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
            .attr('fill', function(d) {
                if (d['abbr'] == 'PR') {
                    return COLORS['teal2'];
                } else if (d['abbr'] == 'GU' || d['abbr'] == 'HI' || d['abbr'] == 'NE') {
                    return COLORS['teal4'];
                } else {
                    return COLORS['teal6'];
                }
            })
            .attr('class', function(d) {
                return 'bar bar-' + classify(d['abbr']);
            });
    
    svg.append('line')
        .attr('class', 'y grid grid-0')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(0))
        .attr('y2', y(0));
    
    // shift axis labels
    if (!isMobile) {
        d3.selectAll('.x.axis .tick line')
            .attr('y2', function(d,i) {
                if (i%2 == 1) {
                    return 15;
                } else {
                    return 5;
                }
            });
        d3.selectAll('.x.axis .tick text')
            .attr('dy', function(d,i) {
                if (i%2 == 1) {
                    return 18;
                } else {
                    return 6;
                }
            });
    }
        
    // PR text
    var annotationBlocks = svg.append('g')
        .attr('class', 'annotations');
    
    var annotationLines = annotationBlocks.selectAll('line')
        .data(annotations)
        .enter().append('line')
            .attr('class', function(d) {
                return classify(d['abbr']);
            })
            .attr('x1', function(d) {
                return (x(d['abbr']) + (x.rangeBand() / 2));
            })
            .attr('x2', function(d) {
                return (x(d['abbr']) + (x.rangeBand() / 2));
            })
            .attr('y1', function(d) {
                return y(d['pct']);
            })
            .attr('y2', function(d) {
                return (y(d['pct']) - 20);
            });
    
    var annotationText = annotationBlocks.selectAll('text')
        .data(annotations)
        .enter().append('text')
            .attr('class', function(d) {
                return classify(d['abbr']);
            })
            .attr('x', function(d) {
                if (d['abbr'] == 'NE') {
                    return x(d['abbr']) + x.rangeBand();
                } else if (d['abbr'] == 'GU') {
                    return x(d['abbr']) + (x.rangeBand() / 2);
                } else {
                    return x(d['abbr']);
                }
            })
            .attr('y', function(d) {
                var l = d3.select('.annotations line.' + classify(d['abbr']));
                return (l.attr('y2') - 32);
            })
            .attr('text-anchor', function(d) {
                if (d['abbr'] == 'NE') {
                    return 'end';
                } else {
                    return 'begin';
                }
            });
    
    annotationText.append('tspan')
        .attr('x', function(d) {
            if (d['abbr'] == 'NE') {
                return x(d['abbr']) + x.rangeBand();
            } else if (d['abbr'] == 'GU') {
                return x(d['abbr']) + (x.rangeBand() / 2);
            } else {
                return x(d['abbr']);
            }
        })
        .attr('dy', '1.2em')
        .text(function(d) {
            return d['label'];
        });

    annotationText.append('tspan')
        .attr('x', function(d) {
            if (d['abbr'] == 'NE') {
                return x(d['abbr']) + x.rangeBand();
            } else if (d['abbr'] == 'GU') {
                return x(d['abbr']) + (x.rangeBand() / 2);
            } else {
                return x(d['abbr']);
            }
        })
        .attr('dy', '1.2em')
        .text(function(d) {
            return d['pct'] + '%';
        });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
