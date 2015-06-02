// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

// var GRAPHIC_DATA = null; <!-- defined in child_template.html
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 550;
var VALUE_MIN_HEIGHT = 20;

var BAR_COLOR = [];
BAR_COLOR['price'] = 'teal';
BAR_COLOR['cost_as_share_of_income'] = 'red';

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

var isMobile = false;
var annotations = [];
var usAverages = [];


/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        graphicD3 = d3.select('#graphic');
        
        GRAPHIC_DATA.forEach(function(d) {
            d['price'] = +d['price'];
            d['cost_as_share_of_income'] = (+d['cost_as_share_of_income']) * 100;
            
            if (d['abbr'] == 'PR' || d['abbr'] == 'GU' || d['abbr'] == 'HI' || d['abbr'] == 'WA') {
                var abbr = d['abbr'];
                annotations.push({ 'label': d['state'], 
                                   'abbr': d['abbr'],
                                   'price': +d['price'],
                                   'cost_as_share_of_income': +d['cost_as_share_of_income'] });
            }
            
            if (d['abbr'] == 'US') {
                usAverages = ({ 'label': d['state'], 
                                'abbr': d['abbr'],
                                'price': +d['price'],
                                'cost_as_share_of_income': +d['cost_as_share_of_income'] });
            }
        });
        
        console.log(usAverages);
        
        GRAPHIC_DATA = GRAPHIC_DATA.filter(function(d) {
            if (d['abbr'] != 'US') {
                return d;
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
    drawGraph(containerWidth, 'price');
    graphicD3.append('h3')
        .html(HDR_COST_AS_SHARE_OF_INCOME);
    drawGraph(containerWidth, 'cost_as_share_of_income');

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, id) {
    GRAPHIC_DATA.sort(arraySort('-' + id));
    
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
        left: 42
    };
    if (isMobile) {
        margin['left'] = 0;
        margin['bottom'] = 5;
    }
    var ticksY = 4;
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((width * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];

    var x = d3.scale.ordinal()
        .domain(GRAPHIC_DATA.map(function (d) {
            return d['abbr'];
        }));
    
    if (isMobile) {
        x.rangeBands([0, width], .25);
    } else {
        x.rangeBands([0, width], .1);
    }

    var y = d3.scale.linear()
        .domain([ 0, d3.max(GRAPHIC_DATA, function(d) {
            switch(id) {
                case 'price':
                    return Math.ceil(d[id]/20) * 20; // round to next 20
                    break;
                case 'cost_as_share_of_income':
                    return Math.ceil(d[id]/.1) * .1; // round to next .1
                    break;
            }
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
            switch(id) {
                case 'price':
                    return d + '\u00A2';
                    break;
                case 'cost_as_share_of_income':
                    return d.toFixed(2) + '%';
                    break;
            }
        });

    var y_axis_grid = function() { return yAxis; }
    
    // draw the chart itself
    var svg = graphicD3.append('svg')
        .attr('id', classify(id))
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
                if (d[id] < 0) {
                    return y(0);
                } else {
                    return y(d[id]);
                }
            })
            .attr('width', x.rangeBand())
            .attr('height', function(d){
                if (d[id] < 0) {
                    return y(d[id]) - y(0);
                } else {
                    return y(0) - y(d[id]);
                }
            })
            .attr('fill', function(d) {
                var c = BAR_COLOR[id];
                if (d['abbr'] == 'PR') {
                    return COLORS[c + '2'];
                } else if (d['abbr'] == 'GU' || d['abbr'] == 'HI' || d['abbr'] == 'WA') {
                    return COLORS[c + '4'];
                } else {
                    return COLORS[c + '6'];
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
        d3.selectAll('#' + classify(id) + ' .x.axis .tick line')
            .attr('y2', function(d,i) {
                if (i%2 == 1) {
                    return 15;
                } else {
                    return 5;
                }
            });
        d3.selectAll('#' + classify(id) + ' .x.axis .tick text')
            .attr('dy', function(d,i) {
                if (i%2 == 1) {
                    return 18;
                } else {
                    return 6;
                }
            });
    }
        
    // us avg
    var annotationsUS = svg.append('g')
        .attr('class', 'annotations us');
    
    annotationsUS.append('line')
        .attr('class', classify(usAverages['abbr']))
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(usAverages[id]))
        .attr('y2', y(usAverages[id]));

    annotationsUS.append('text')
        .attr('class', classify(usAverages['abbr']))
        .attr('x', width/2)
        .attr('y', y(usAverages[id]) - 6)
        .attr('text-anchor', 'middle')
        .text(function() {
            var label = usAverages['label'];
            switch(id) {
                case 'price':
                    label += ': ' + usAverages[id].toFixed(1) + '\u00A2 per kWh';
                    break;
                case 'cost_as_share_of_income':
                    label += ': ' + usAverages[id].toFixed(2) + '%';
                    break;
            }
            return label;
        });

    // selected state annotations
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
                return y(d[id]);
            })
            .attr('y2', function(d) {
                var offset = 20;
                if (id == 'price' && d['abbr'] == 'GU') {
                    offset = 33;
                } else if (id == 'price' && d['abbr'] == 'PR') {
                    offset = 6;
                } else if (id == 'price' && d['abbr'] == 'WA') {
                    offset = 33;
                } else if (id == 'cost_as_share_of_income' && d['abbr'] == 'GU') {
                    offset = 33;
                } else if (id == 'cost_as_share_of_income' && d['abbr'] == 'HI') {
                    offset = 6;
                }
                return (y(d[id]) - offset);
            });
    
    var annotationText = annotationBlocks.selectAll('text')
        .data(annotations)
        .enter().append('text')
            .attr('class', function(d) {
                return classify(d['abbr']);
            })
            .attr('x', function(d) {
                if (d['abbr'] == 'WA') {
                    return x(d['abbr']) + x.rangeBand();
                } else if (d['abbr'] == 'GU') {
                    return x(d['abbr']) + (x.rangeBand() / 2);
                } else {
                    return x(d['abbr']);
                }
            })
            .attr('y', function(d) {
                var l = d3.select('#' + classify(id) + ' .annotations line.' + classify(d['abbr']));
                return (l.attr('y2') - 28);
            })
            .attr('text-anchor', function(d) {
                if (d['abbr'] == 'WA') {
                    return 'end';
                } else {
                    return 'begin';
                }
            });
    
    annotationText.append('tspan')
        .attr('x', function(d) {
            if (d['abbr'] == 'WA') {
                return x(d['abbr']) + x.rangeBand();
            } else if (d['abbr'] == 'GU') {
                return x(d['abbr']) + (x.rangeBand() / 2);
            } else {
                return x(d['abbr']);
            }
        })
        .attr('dy', '1.1em')
        .text(function(d) {
            return d['label'];
        });

    annotationText.append('tspan')
        .attr('x', function(d) {
            if (d['abbr'] == 'WA') {
                return x(d['abbr']) + x.rangeBand();
            } else if (d['abbr'] == 'GU') {
                return x(d['abbr']) + (x.rangeBand() / 2);
            } else {
                return x(d['abbr']);
            }
        })
        .attr('dy', '1.1em')
        .text(function(d) {
            switch(id) {
                case 'price':
                    return d[id].toFixed(1) + '\u00A2 per kWh';
                    break;
                case 'cost_as_share_of_income':
                    return d[id].toFixed(2) + '%';
                    break;
            }
        });
}


/*
 * HELPERS
 */
var arraySort = function(property) {
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}
// http://stackoverflow.com/questions/1129216/sorting-objects-in-an-array-by-a-field-value-in-javascript



/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
