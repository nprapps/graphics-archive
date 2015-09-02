// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var SIDEBAR_THRESHOLD = 280;

// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;
var graphicData = null;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        //loadCSV('data.csv')
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
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
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
    graphicData.forEach(function(d) {
        d['start'] = +d['start'];
        d['end'] = +d['end'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }
    
    var graphicWidth = containerWidth;
    var gutterWidth = 11;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - (gutterWidth * 2)) / 3);
    }

    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');
    
    // Render the chart!
    var charts = [ 'income', 'employment', 'poverty' ];
    
    // define color scale
    var keyItems = _.pluck(graphicData, 'label');
    keyItems = d3.set(keyItems).values();
    var colors = [ '#ccc', COLORS['teal2'], COLORS['teal5'] ];
    
    var colorScale = d3.scale.ordinal()
        .domain(keyItems)
        .range(colors);
    
    // draw legend
    renderLegend({
        container: '#graphic',
        scale: colorScale
    });
    
    // draw slopes
    charts.forEach(function(v, k) {
        var units = '%';

        if (v == 'income') {
            units = '$';
        }

        containerElement.append('div')
            .attr('id', v)
            .attr('class', 'graphic')
            .attr('style', function() {
                var s = '';
                if (!isMobile) {
                    s += 'width: ' + graphicWidth + 'px;';
                    s += 'float: left;';
                    if (k > 0) {
                        s += 'margin-left: ' + gutterWidth + 'px;'
                    }
                }
                return s;
            });

        renderSlopegraph({
            container: '#' + v,
            width: graphicWidth,
            data: graphicData.filter(function(d) {
                return d['chart'] == v;
            }),
            metadata: GRAPHIC_METADATA,
            units: GRAPHIC_METADATA['units_' + v],
            tickFactor: GRAPHIC_METADATA['tickfactor_' + v],
            scale: colorScale,
            title: GRAPHIC_METADATA['hdr_' + v]
        });

    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render legend
 */
var renderLegend = function(config) {
    var colorScale = config['scale'];
    
    var containerElement = d3.select(config['container']);
    
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(colorScale.domain())
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
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
    
    var colorScale = config['scale'];

    var aspectWidth = 1;
    var aspectHeight = 1;

    var margins = {
        top: 20,
        right: 50,
        bottom: 20,
        left: 50
    };

    var ticksX = 2;
    var ticksY = 10;
    var roundTicksFactor = config['tickFactor'];
    var dotRadius = 3;
    var labelGap = 42;

    // Mobile
//     if (isSidebar) {
//         aspectWidth = 2;
//         aspectHeight = 3;
//         margins['left'] = 30;
//         margins['right'] = 105;
//         labelGap = 32;
//     } else if (isMobile) {
//         aspectWidth = 2.5
//         aspectHeight = 3;
//         margins['right'] = 145;
//     }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    var containerElement = d3.select(config['container']);
    
    // add title
    containerElement.append('h3')
        .text(config['title']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain([startLabel, endLabel])
        .range([0, chartWidth]);

    var yScale = d3.scale.linear()
        .domain([
            0,
//             d3.min(config['data'], function(d) {
//                 return Math.floor(d[startColumn] / roundTicksFactor) * roundTicksFactor;
//             }),
            d3.max(config['data'], function(d) {
                return Math.ceil(d[endColumn] / roundTicksFactor) * roundTicksFactor;
            })
        ])
        .range([chartHeight, 0]);

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
    
    // bg boxes
    chartElement.append('rect')
        .attr('class', 'bg')
        .attr('x', xScale(0))
        .attr('width', chartWidth)
        .attr('y', 0)
        .attr('height', chartHeight)
        .attr('fill', '#f1f1f1');

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
            .attr('dy', function(d) {
                var dy = 3;
                if (d['chart'] == 'income' && d['label'] == 'All adults 21-64 years old') {
                    dy = 9;
                }
                if (d['chart'] == 'income' && d['label'] == 'Without a work limitation') {
                    dy = 0;
                }

                if (d['chart'] == 'poverty' && d['label'] == 'All adults 21-64 years old') {
                    dy = -3;
                }
                if (d['chart'] == 'poverty' && d['label'] == 'Without a work limitation') {
                    dy = 9;
                }

                if (d['chart'] == 'employment' && d['label'] == 'All adults 21-64 years old') {
                    dy = 6;
                }
                if (d['chart'] == 'employment' && d['label'] == 'Without a work limitation') {
                    dy = -3;
                }
                return dy;
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                switch(config['units']) {
                    case '$':
                        return '$' + fmtComma(d[startColumn]);
                        break;
                    default:
                        if (isSidebar) {
                            return d[startColumn].toFixed(0) + '%';
                        }
                        return d[startColumn] + '%';
                        break;
                }
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
            .attr('dy', function(d) {
                var dy = 3;
                if (d['chart'] == 'poverty' && d['label'] == 'All adults 21-64 years old') {
                    dy = -3;
                }
                if (d['chart'] == 'poverty' && d['label'] == 'Without a work limitation') {
                    dy = 9;
                }

                if (d['chart'] == 'employment' && d['label'] == 'All adults 21-64 years old') {
                    dy = 6;
                }
                if (d['chart'] == 'employment' && d['label'] == 'Without a work limitation') {
                    dy = 0;
                }
                return dy;
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                switch(config['units']) {
                    case '$':
                        return '$' + fmtComma(d[endColumn]);
                        break;
                    default:
                        if (isSidebar) {
                            return d[endColumn].toFixed(0) + '%';
                        }
                        return d[endColumn].toFixed(1) + '%';
                        break;
                }
            });

    /*
     * Render labels.
     */
//     chartElement.append('g')
//         .attr('class', 'label')
//         .selectAll('text')
//         .data(config['data'])
//         .enter()
//         .append('text')
//             .attr('x', xScale(endLabel))
//             .attr('y', function(d) {
//                 return yScale(d[endColumn]);
//             })
//             .attr('text-anchor', 'begin')
//             .attr('dx', function(d) {
//                 return labelGap;
//             })
//             .attr('dy', function(d) {
//                 return 3;
//             })
//             .attr('class', function(d, i) {
//                 return classify(d[labelColumn]);
//             })
//             .text(function(d) {
//                 return d[labelColumn];
//             })
//             .call(wrapText, (margins['right'] - labelGap), 16);
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

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
