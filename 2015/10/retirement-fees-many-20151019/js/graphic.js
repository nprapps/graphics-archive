// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var formattedData = null;
var chartSteps = [];
var currentStep = null;
var maxSteps = null;

var area = null;
var areaShape = null;
var buttonBack = null;
var buttonNext = null;
var descriptionText = null;
var line = null;

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
        for (var key in d) {
            d[key] = +d[key];
        }
    });
    
    chartSteps = d3.keys(graphicData[0]).filter(function(d) {
        return d != 'year';
    });

    maxSteps = chartSteps.length - 1;
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }
    
    currentStep = null;

    // Render the chart!
    renderLineChart({
        container: '#graphic',
        width: containerWidth,
        data: graphicData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'year';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 8;

    var margins = {
        top: 5,
        right: 85,
        bottom: 40,
        left: 55
    };

    var ticksX = 5;
    var ticksY = 10;
    var roundTicksFactor = 20000;
    
    var valueLineHeight = 16;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 65;
        valueLineHeight = 12;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    formattedData = {};

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in graphicData[0]) {
        if (column == dateColumn) {
            continue;
        }

        formattedData[column] = graphicData.map(function(d) {
            return {
                'year': d[dateColumn],
                'amt': d[column]
            };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.linear()
        .domain([ 0, d3.max(d3.entries(formattedData), function(c) {
                return d3.max(c['value'], function(v) {
                    return v['year'];
                });
            })
        ])
        .range([ 0, chartWidth ])
    
    var yScale = d3.scale.linear()
        .domain([ 0, d3.max(d3.entries(formattedData), function(c) {
                return d3.max(c['value'], function(v) {
                    var n = v[valueColumn];
                    return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
                });
            })
        ])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(key) {
            return key !== dateColumn;
        }))
        .range([ COLORS['teal3'], COLORS['red3'], COLORS['red3'], COLORS['red3'] ]);

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
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            return d.toFixed(0);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            return '$' + fmtComma(d);
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );
    
    /* Render area */
    chartElement.append('defs')
      .append('pattern')
        .attr('id', 'diagonalHatch')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
      .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', COLORS['red6'])
        .attr('stroke-width', 1);
    
    area = d3.svg.area()
        .x(function(d,i) {
            return xScale(d[dateColumn]);
        })
        .y0(function(d,i) {
            return yScale(d3.entries(formattedData)[0]['value'][i][valueColumn]);
        })
        .y1(function(d,i) {
            return yScale(d[valueColumn]);
        });
        
    areaShape = chartElement.append('g')
        .attr('class', 'areas')
        .selectAll('.area')
        .data([ d3.entries(formattedData)[0] ])
        .enter()
            .append('path')
            .attr('class', function(d, i) {
                return 'area area-' + i;
            })
            .attr('d', function(d) {
                return area(d['value']);
            })
            .style('fill', 'url(#diagonalHatch)');
    
    /*
     * Render lines to chart.
     */
    line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' l-' + classify(d['key']);
            })
            .classed('active', function(d, i) {
                if (i == 0) {
                    return true;
                } else {
                    return false;
                }
            })
            .attr('stroke', function(d) {
                return colorScale(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });

    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(d3.entries(formattedData))
        .enter()
        .append('circle')
            .attr('cx', function(d) {
                var endValue = d['value'][d['value'].length - 1][dateColumn];
                return xScale(endValue);
            })
            .attr('cy', function(d) {
                var endValue = d['value'][d['value'].length - 1][valueColumn];
                return yScale(endValue);
            })
            .attr('class', function(d, i) {
                return 'dot-' + i + ' d-' + classify(d['key']);
            })
            .attr('r', 3)
            .style('fill', function(d) {
                return colorScale(d['key'])
            });

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(d3.entries(formattedData))
        .enter().append('text')
            .attr('class', function(d, i) {
                return 'value-' + i + ' v-' + classify(d['key']);
            })
            .classed('init', true)
            .attr('x', function(d, i) {
                var last = d['value'][d['value'].length - 1];

                return xScale(last[dateColumn]);
            })
            .attr('y', function(d) {
                var last = d['value'][d['value'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .attr('dx', 8)
            .attr('dy', 0)
            .attr('fill', function(d) {
                return colorScale(d['key']);
            })
            .text(function(d, i) {
                var last = d['value'][d['value'].length - 1];
                var value = last[valueColumn];

                var label = '$' + fmtComma(last[valueColumn].toFixed(0));
                if (i == 0) {
                    label = d['key'] + ': ' + label;
                }

                return label;
            })
            .call(wrapText, (margins['right'] - 5), valueLineHeight)
            .classed('init', false);
    
    // x-axis label
    chartElement.append('text')
        .attr('class', 'axis label')
        .attr('x', (chartWidth / 2))
        .attr('y', (margins['top'] + chartHeight + 35))
        .text('Years since initial investment');
    
    
    var infoElement = d3.select('#info');
    infoElement.html('');
    
    var buttonWrapper = infoElement.append('div')
        .attr('id', 'buttons');
    
    buttonBack = buttonWrapper.append('button');
    buttonBack.classed('enabled', true)
        .classed('btn-back', true)
        .append('span')
        .html('<');
    buttonBack.on('click', gotoPrevStep);

    buttonNext = buttonWrapper.append('button');
    buttonNext.classed('enabled', true)
        .classed('btn-next', true)
        .append('span')
        .html('>');
    buttonNext.on('click', gotoNextStep);
    
    descriptionText = infoElement.append('p')
        .attr('id', 'description')
        .append('span');
        
    gotoNextStep();
}

var gotoNextStep = function() {
    if (currentStep == null) {
        currentStep = 0;
    } else {
        currentStep++;
    }
    
    if (currentStep > maxSteps) {
        currentStep = 0;
    }
    
    changeStep();
}

var gotoPrevStep = function() {
    if (currentStep == null) {
        currentStep = 0;
    } else {
        if (currentStep > 0) {
            currentStep--;
            changeStep();
        }
    }
}

var changeStep = function() {
    var animationDuration = 1000;
    if (currentStep == 0) {
        animationDuration = 0;
        buttonBack.classed('enabled', false);
    } else {
        buttonBack.classed('enabled', true);
    }
    
    var firstKey = chartSteps[0];
    var currentKey = chartSteps[currentStep];

    // transition the shaded area
    areaShape
        .data([ d3.entries(formattedData)[currentStep] ])
        .transition()
            .duration(animationDuration)
            .attr('d', function(d) {
                return area(d['value']);
            })
            .each('end', function() {
                d3.selectAll('path.line, .dots circle, .value text')
                    .classed('active', function(d) {
                        if (d['key'] == firstKey || d['key'] == currentKey) {
                            return true;
                        } else {
                            return false;
                        }
                    })
                    .classed('inactive', function(d, i) {
                        var wasPastStep = false;
                        chartSteps.forEach(function(v, k) {
                            if (d['key'] == v && k < currentStep) {
                                wasPastStep = true;
                            }
                        });
                
                        if (d['key'] != firstKey && d['key'] != currentKey && wasPastStep) {
                            return true;
                        } else {
                            return false;
                        }
                    });
            
                descriptionText.html(DESCRIPTIONS[currentStep]);
            
                if (currentStep == maxSteps) {
                    buttonNext.select('span').html('Replay');
                } else {
                    buttonNext.select('span').html('>');
                }
            });
    
    if (currentStep > 0) {
//         d3.select('path.line.l-' + classify(currentKey))
//             .data([ d3.entries(formattedData)[currentStep - 1] ])
//             .attr('d', function(d) {
//                 return line(d['value']);
//             })
//             .data([ d3.entries(formattedData)[currentStep] ])
//             .transition()
//                 .duration(animationDuration)
//                 .attr('d', function(d) {
//                     return line(d['value']);
//                 });
    }
};


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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
