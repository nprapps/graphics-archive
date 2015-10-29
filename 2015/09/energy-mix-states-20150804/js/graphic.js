// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var SIDEBAR_THRESHOLD = 280;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

var label_pos = {
    'United States': { 
        'left': { 'Hydro': 0, 'Petroleum': 2, 'Renewables': 10 },
        'right': { 'Hydro': -6, 'Renewables': 6 }
    },
    'Alabama': { 
        'left': { 'Natural gas': 2, 'Hydro': 6 },
        'right': { 'Coal': -8, 'Nuclear': 8 }
    },
    'Alaska': {
        'right': { 'Coal': 2 }
    },
    'Arizona': {
        'right': { 'Hydro': 2, 'Renewables': 8 }
    },
    'Arkansas': {
        'left': { 'Natural gas': 0, 'Hydro': 6 }
    },
    'California': {
        'left': { 'Hydro': -2 },
        'right': { 'Hydro': -2, 'Nuclear': 10 }
    },
    'Colorado': {
        'left': { 'Hydro': 0, 'Renewables': 6 }
    },
    'Connecticut': {
        'left': { 'Petroleum': 0 },
        'right': { 'Coal': -10, 'Petroleum': -1, 'Renewables': 12 }
    },
    'Delaware': {
        'right': { 'Petroleum': -1, 'Renewables': 8 }
    },
    'Florida': {
        'left': { 'Petroleum': -1 }
    },
    'Georgia': {
        'left': { 'Hydro': 8 },
        'right': { 'Coal': 0 }
    },
    'Idaho': {
        'right': { 'Renewables': 2 }
    },
    'Illinois': {
        'left': { 'Natural gas': -2, 'Renewables': 8 },
        'right': { 'Renewables': 0 }
    },
    'Indiana': {
        'left': { 'Natural gas': -2 }
    },
    'Iowa': {
        'left': { 'Renewables': 0, 'Natural gas': 8 },
        'right': { 'Nuclear': 3, 'Natural gas': 1, 'Hydro': 8 }
    },
    'Kansas': {
        'left': { 'Natural gas': 0, 'Renewables': 8 },
        'right': { 'Natural gas': 1 }
    },
    'Kentucky': {
        'right': { 'Hydro': -8, 'Natural gas': 1, 'Petroleum': 8 }
    },
    'Louisiana': {
        'left': { 'Natural gas': 0, 'Coal': 6 },
        'right': { 'Coal': -1 }
    },
    'Maine': {
        'right': { 'Natural gas': -1, 'Hydro': 0, 'Renewables': 6 }
    },
    'Maryland': {
        'left': { 'Petroleum': -6, 'Hydro': 0, 'Natural gas': 2, 'Renewables': 8 },
        'right': { 'Coal': 2, 'Natural gas': -9, 'Hydro': -3, 'Renewables': 2, 'Petroleum': 9 }
    },
    'Massachusetts': {
        'left': { 'Hydro': 6, 'Petroleum': 0, 'Renewables': 0 },
        'right': { 'Coal': -2, 'Hydro': 10, 'Petroleum': 3, 'Other': 5, 'Renewables': 0 }
    },
    'Mississippi': {
        'left': { 'Natural gas': 2, 'Nuclear': 6 },
        'right': { 'Coal': 0, 'Nuclear': 8 }
    },
    'Missouri': {
        'left': { 'Natural gas': 1, 'Hydro': 8 },
        'right': { 'Natural gas': 2 }
    },
    'Montana': {
        'left': { 'Petroleum': 0, 'Renewables': 8 },
        'right': { 'Petroleum': 8, 'Natural gas': -2, 'Renewables': -2 }
    },
    'Nebraska': {
        'left': { 'Renewables': 8 },
        'right': { 'Renewables': 0, 'Hydro': 6 }
    },
    'Nevada': {
        'left': { 'Hydro': 0, 'Renewables': 8 },
        'right': { 'Renewables': 2 }
    },
    'New Hampshire': {
        'left': { 'Natural gas': 0, 'Petroleum': -1, 'Renewables': 10 },
        'right': { 'Hydro': 12, 'Coal': 1, 'Renewables': -2, 'Petroleum': 9 }
    },
    'New Jersey': {
        'left': { 'Petroleum': 2, 'Renewables': 10 },
        'right': { 'Nuclear': 0, 'Natural gas': 6, 'Coal': -6, 'Renewables': 1, 'Petroleum': 8 }
    },
    'New York': {
        'left': { 'Petroleum': 8, 'Natural gas': 0, 'Coal': 1 },
        'right': { 'Renewables': -4, 'Coal': 3, 'Petroleum': 9 }
    },
    'North Carolina': {
        'left': { 'Hydro': -1, 'Natural gas': 3, 'Renewables': 8 },
        'right': { 'Hydro': 2, 'Renewables': 8 },
    },
    'Pennsylvania': {
        'left': { 'Natural gas': 0, 'Renewables': 8 },
        'right': { 'Coal': -1, 'Nuclear': 9, 'Renewables': 2, 'Petroleum': 8 }
    },
    'South Carolina': {
        'left': { 'Natural gas': 2 }
    },
    'South Dakota': {
        'left': { 'Natural gas': 8, 'Renewables': 0 },
        'right': { 'Renewables': 0, 'Coal': 6 }
    },
    'Tennessee': {
        'right': { 'Hydro': 0 }
    },
    'Texas': {
        'left': { 'Natural gas': 2, 'Coal': 6 },
        'right': { 'Coal': 6, 'Nuclear': -4, 'Renewables': 7 }
    },
    'Utah': {
        'left': { 'Natural gas': 0, 'Renewables': 6 }
    },
    'Virginia': {
        'left': { 'Natural gas': 0, 'Petroleum': 6 },
        'right': { 'Natural gas': 0, 'Coal': 10, 'Renewables': 1, 'Petroleum': 8 }
    },
    'Washington': {
        'left': { 'Coal': -6, 'Nuclear': 0, 'Natural gas': 8 },
        'right': { 'Natural gas': -9, 'Nuclear': -2, 'Coal': 12 }
    },
    'Wisconsin': {
        'left': { 'Natural gas': -1, 'Hydro': 5, 'Renewables': 10 },
        'right': { 'Nuclear': 0, 'Renewables': -4 }
    }
};

// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
//        loadLocalData(GRAPHIC_DATA);
        loadCSV('data.json')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.json(url, function(error, data) {
        graphicData = data;
        
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    graphicData.forEach(function(d, i) {
        var fuelsFiltered = [];
        for (fuel in d['fuels']) {
            var f = d['fuels'][fuel];
            f[0]['year'] = fmtYearFull.parse(f[0]['year']);
            f[0]['amt'] = +f[0]['amt'];
            f[1]['year'] = fmtYearFull.parse(f[1]['year']);
            f[1]['amt'] = +f[1]['amt'];
            
            if ((f[0]['amt'].toFixed(2) > .01 || f[1]['amt'].toFixed(2) > .01) &&
                fuel != 'Other' && fuel != 'All fuels') {
                fuelsFiltered[fuel] = [];
                fuelsFiltered[fuel].push({ 'year': f[0]['year'],
                                           'amt': +f[0]['amt'] });
                fuelsFiltered[fuel].push({ 'year': f[1]['year'],
                                           'amt': +f[1]['amt'] });
            }
        }
        d['fuelsFiltered'] = fuelsFiltered;
        
        if (d['name'] == 'Utah') {
            console.log(d);
        }
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    var graphicWidth = null;

    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }
    
    var num_across = 5;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    if (containerWidth >= 1100) {
        num_across = 6;
    } else if (containerWidth >= 950 && containerWidth < 1100) {
        num_across = 5;
    } else if (containerWidth >= 750 && containerWidth < 950) {
        num_across = 4;
    } else if (containerWidth >= 550 && containerWidth < 750) {
        num_across = 3;
    } else if (containerWidth >= 375 && containerWidth < 550) {
        num_across = 2;
    } else {
        num_across = 1;
    }

    if (num_across == 1) {
        graphicWidth = containerWidth;
    } else {
        graphicWidth = Math.floor((containerWidth - (num_across * 11)) / num_across);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    // Render the chart!
    graphicData.forEach(function(d, i) {
        if (d['name'] == 'United States') {
            draw_graph({
                container: '#graphic',
                width: graphicWidth,
                data: d
            });
        }
    });
    graphicData.forEach(function(d, i) {
        if (d['name'] != 'United States') {
            draw_graph({
                container: '#graphic',
                width: graphicWidth,
                data: d
            });
        }
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render slope (old code)
 */
function draw_graph(config) {
    /*
     * Setup
     */
    var margins = { 
        top: 5, 
        right: 100, 
        bottom: 11, 
        left: 25
    };
    var dotRadius = 3;
    var fuels = config['data']['fuelsFiltered'];

    // Calculate actual chart dimensions
    var width = config['width'] - margins['left'] - margins['right'];
    var height = 250 - margins['top'] - margins['bottom'];
    var containerElement = d3.select(config['container']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .range([0, width])
        .domain([ fmtYearFull.parse('2004'), fmtYearFull.parse('2014') ]);

    var yScale = d3.scale.linear()
        .range([height, 0])
        .domain([0, 1.0]);
    
    var line = d3.svg.line()
        .x(function(d) { 
            return xScale(d['year']);
        })
        .y(function(d) { 
            return yScale(d['amt']);
        });
        
    var colorScale = d3.scale.ordinal()
//        .domain(_.pluck(config['data'], labelColumn))
        .domain([ 'Coal', 'Petroleum', 'Natural gas', 'Nuclear', 'Hydro', 'Renewables', 'Other' ])
        .range([ '#D8472B', '#777', '#EAAA61', '#F3D469', '#7DBFE6', '#51A09E', '#ccc' ]);
    
    /*
     * Create the wrapper element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'chart ' + classify(config['data']['name']))
        .attr('style', 'width: ' + config['width'] + 'px');
        
    /*
     * Add state name and year labels
     */
    chartWrapper.append('h3')
        .attr('style', 'margin-left: ' + margins['left'] + 'px')
        .text(config['data']['name']);
    
    var years = chartWrapper.append('h4');
    years.append('span')
        .attr('style', 'left: ' + margins['left'] + 'px')
        .text(fmtYearFull(xScale.domain()[0]));
    years.append('span')
        .attr('style', 'right: ' + margins['right'] + 'px')
        .text(fmtYearFull(xScale.domain()[1]));

    /*
     * Create the root SVG element.
     */
    var chartElement = chartWrapper.append('svg')
        .attr('width', width + margins['left'] + margins['right'])
        .attr('height', height + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');
    
    chartElement.append('rect')
        .attr('class', 'bg')
        .attr('width', width)
        .attr('height', height);    
    
    /*
     * Render lines to chart.
     */
    chartElement.append('g')
        .selectAll('path')
            .data(d3.entries(fuels))
        .enter()
            .append('path')
                .attr('class', function(d, i) {
                    return 'line line-' + i + ' ' + classify(d['key']) + ' val-a' + (d['value'][0]['amt'] * 100).toFixed(0) + ' val-b' + (d['value'][1]['amt'] * 100).toFixed(0);
                })
                .attr('stroke', function(d) {
                    return colorScale(d['key']);
                })
                .attr('d', function(d) {
                    return line(d['value']);
                });

    /*
     * Move a particular line to the front of the stack
     */
    chartElement.select('line.coal').moveToFront();

    /*
     * Render dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots start')
        .selectAll('circle')
            .data(d3.entries(fuels))
        .enter()
        .append('circle')
            .attr('cx', xScale(xScale.domain()[0]))
            .attr('cy', function(d) {
                return yScale(d['value'][0]['amt']);
            })
            .attr('class', function(d) {
                return classify(d['key']);
            })
            .attr('r', dotRadius)
            .style('fill', function(d) {
                 return colorScale(d['key']);
            });

    chartElement.append('g')
        .attr('class', 'dots end')
        .selectAll('circle')
            .data(d3.entries(fuels))
        .enter()
        .append('circle')
            .attr('cx', xScale(xScale.domain()[1]))
            .attr('cy', function(d) {
                return yScale(d['value'][1]['amt']);
            })
            .attr('class', function(d) {
                return classify(d['key']);
            })
            .attr('r', dotRadius)
            .style('fill', function(d) {
                 return colorScale(d['key']);
            });

    /*
     * Render values.
     */
    chartElement.append('g')
        .attr('class', 'value begin')
        .selectAll('text')
            .data(d3.entries(fuels))
        .enter().append('text')
            .attr('x', function(d, i) { 
                return xScale(d['value'][0]['year']);
            })
            .attr('y', function(d) { 
                var ypos = yScale(d['value'][0]['amt']);
                return ypos;
            })
            .attr('dx', -6)
            .attr('dy', function(d) {
                return adjust_labels(config['data']['name'], d['key'], 'left');
            })
            .attr('text-anchor', 'end')
            .attr('class', function(d) { 
                return classify(d['key']) + ' val-a' + format_pct(d['value'][0]['amt']) + ' val-b' + format_pct(d['value'][1]['amt']);
            })
            .text(function(d) { 
                return format_pct(d['value'][0]['amt']);
            });

    chartElement.append('g')
        .attr('class', 'value end')
        .selectAll('text')
            .data(d3.entries(fuels))
        .enter().append('text')
            .attr('x', function(d, i) { 
                return xScale(d['value'][1]['year']);
            })
            .attr('y', function(d) { 
                return yScale(d['value'][1]['amt']);
            })
            .attr('dx', 27)
            .attr('dy', function(d) {
                return adjust_labels(config['data']['name'], d['key'], 'right');
            })
            .attr('text-anchor', 'end')
            .attr('class', function(d) { 
                return classify(d['key']) + ' val-a' + format_pct(d['value'][0]['amt']) + ' val-b' + format_pct(d['value'][1]['amt']);
            })
            .text(function(d) { 
                return format_pct(d['value'][1]['amt']) + '%';
            });

    chartElement.append('g')
        .attr('class', 'label end')
        .selectAll('text')
            .data(d3.entries(fuels))
        .enter().append('text')
            .attr('x', function(d, i) { 
                return xScale(d['value'][1]['year']);
            })
            .attr('y', function(d) { 
                return yScale(d['value'][1]['amt']);
            })
            .attr('dx', 32)
            .attr('dy', function(d) {
                return adjust_labels(config['data']['name'], d['key'], 'right');
            })
            .attr('text-anchor', 'start')
            .attr('class', function(d) { 
                return classify(d['key']) + ' val-a' + (d['value'][0]['amt'] * 100).toFixed(0) + ' val-b' + (d['value'][1]['amt'] * 100).toFixed(0);
            })
            .text(function(d) { 
                return d['key'];
            });
}


/*
 * Render a line chart.
 */
var renderSlopegraph = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var startColumn = 'start';
    var endColumn = 'end';

    var startLabel = config['metadata']['startLabel'];
    var endLabel = config['metadata']['endLabel'];

    var aspectWidth = 5;
    var aspectHeight = 3;

    var margins = {
        top: 20,
        right: 185,
        bottom: 20,
        left: 40
    };

    var ticksX = 2;
    var ticksY = 10;
    var roundTicksFactor = 4;
    var dotRadius = 3;
    var labelGap = 42;

    // Mobile
    if (isMobile) {
        aspectWidth = 2.5
        aspectHeight = 3;
        margins['right'] = 145;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain([startLabel, endLabel])
        .range([0, chartWidth])

    var yScale = d3.scale.linear()
        .domain([
            d3.min(config['data'], function(d) {
                return Math.floor(d[startColumn] / roundTicksFactor) * roundTicksFactor;
            }),
            d3.max(config['data'], function(d) {
                return Math.ceil(d[endColumn] / roundTicksFactor) * roundTicksFactor;
            })
        ])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .range([ COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);

    /*
     * Create D3 axes.
     */
    var xAxisTop = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Render axes to chart.
     */
     chartElement.append('g')
         .attr('class', 'x axis')
         .call(xAxisTop);

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render lines to chart.
     */
    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('class', function(d, i) {
                return 'line ' + classify(d[labelColumn]);
            })
            .attr('x1', xScale(startLabel))
            .attr('y1', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('x2', xScale(endLabel))
            .attr('y2', function(d) {
                return yScale(d[endColumn]);
            })
            .style('stroke', function(d) {
                return colorScale(d[labelColumn])
            });

    /*
     * Uncomment if needed:
     * Move a particular line to the front of the stack
     */
    // svg.select('line.unaffiliated').moveToFront();


    /*
     * Render dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots start')
        .selectAll('circle')
        .data(config['data'])
        .enter()
        .append('circle')
            .attr('cx', xScale(startLabel))
            .attr('cy', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('r', dotRadius)
            .style('fill', function(d) {
                return colorScale(d[labelColumn])
            });

    chartElement.append('g')
        .attr('class', 'dots end')
        .selectAll('circle')
        .data(config['data'])
        .enter()
        .append('circle')
            .attr('cx', xScale(endLabel))
            .attr('cy', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('r', dotRadius)
            .style('fill', function(d) {
                return colorScale(d[labelColumn])
            });

    /*
     * Render values.
     */
    chartElement.append('g')
        .attr('class', 'value start')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(startLabel))
            .attr('y', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('text-anchor', 'end')
            .attr('dx', -6)
            .attr('dy', 3)
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                return d[startColumn] + '%';
            });

    chartElement.append('g')
        .attr('class', 'value end')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(endLabel))
            .attr('y', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', 6)
            .attr('dy', 3)
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                return d[endColumn] + '%';
            });

    /*
     * Render labels.
     */
    chartElement.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(endLabel))
            .attr('y', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', function(d) {
                return labelGap;
            })
            .attr('dy', function(d) {
                return 3;
            })
            .attr('class', function(d, i) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                return d[labelColumn];
            })
            .call(wrapText, (margins['right'] - labelGap), 16);
}


/*
 * Wrap a block of text to a given width
 * via http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

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

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

function adjust_labels(state, fuel, side) {
    var dy = 4;

    if (label_pos[state] && label_pos[state][side]) {
        if (label_pos[state][side][fuel] != undefined) {
            dy = label_pos[state][side][fuel];
        }
    }
    return dy;
}

function format_pct(num) {
    return (num * 100).toFixed(0);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
