// Global config
var SIDEBAR_THRESHOLD = 280;

// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;

var labelOffsets0 = {
    'Other Christian': { 'start': 0, 'end': 0  },
    'Unaffiliated': { 'start': -2, 'end': -1  },
    'Hisp. Catholic': { 'start': -1, 'end': -1  },
    'White Catholic': { 'start': 0, 'end': -3  },
    'Black Protestant': { 'start': 2, 'end': 4  },
    'White mainline': { 'start': 0, 'end': 2  },
    'White evangelical': { 'start': 0, 'end': 0  },
    'All others': { 'start': 1, 'end': 0  }
};

var labelOffsets1 = {
    'Other Christian': { 'start': 0, 'end': 4  },
    'Unaffiliated': { 'start': 0, 'end': 0 },
    'Hisp. Catholic': { 'start': 0, 'end': 4  },
    'White Catholic': { 'start': 0, 'end': 2  },
    'Black Protestant': { 'start': 0, 'end': 0  },
    'White mainline': { 'start': 0, 'end': -11  },
    'White evangelical': { 'start': 0, 'end': 6  },
    'All others': { 'start': 0, 'end': -1  }
};


/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    charts = d3.keys(DATA);
    charts.forEach(function(v,k) {
        DATA[v].forEach(function(d) {
            d['start'] = +d['start'];
            d['end'] = +d['end'];
            d['change'] = d['change'];
        })
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }


    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // Clear existing graphic (for redraw)
     var containerElement = d3.select('#slopegraph');

     containerElement.html('');

    //  d3.select('.header')
    //      .attr('style', function() {
    //          var s = '';
    //          if (!isMobile) {
    //              s += 'width: ' + graphicWidth + 'px; ';
    //              s += 'float: left; '
    //          }
    //          return s;
    //      });

     charts.forEach(function(d,i) {
         var chartElement = containerElement.append('div')
             .attr('class', 'chart')
             .attr('id', 'slope-' + d);

         if (!isMobile) {
             chartElement.attr('style', function() {
                 var s = '';
                 s += 'width: ' + graphicWidth + 'px; ';
                 if (i % 2 == 1) {
                     s += 'float: right; ';
                     s += 'padding-left: ' + (gutterWidth / 2) + 'px; ';
                     s += 'border-left: 1px solid #eee; ';
                 } else {
                     s += 'float: left; ';
    //                 s += 'clear: both; ';
                 }
                 return s;
             });
         }

         chartElement.append('h3')
             .text(LABELS['hed_' + d]);

    // Render the chart!
    renderSlopegraph({
        container: '#slope-' + d,
        width: graphicWidth,
        data: DATA[d],
        labels: LABELS,
        height: 320,
        chart: i
    });
})

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
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

    var startLabel = config['labels']['start_label'];
    var endLabel = config['labels']['end_label'];

    var margins = {
        top: 20,
        right: 150,
        bottom: 40,
        left: 40
    };

    var ticksX = 2;
    var ticksY = 10;
    var roundTicksFactor = 4;
    var dotRadius = 3;
    var labelGap = 42;
    var maxWidth = 125;

    // Mobile
    // if (isSidebar) {
    //     aspectWidth = 2;
    //     aspectHeight = 3;
    //     margins['left'] = 30;
    //     margins['right'] = 105;
    //     labelGap = 32;
    // } else if (isMobile) {
    //     aspectWidth = 2.5
    //     aspectHeight = 3;
    //     margins['right'] = 145;
    // }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    if (chartWidth > maxWidth) {
        chartWidth = maxWidth;
        margins['right'] = config['width'] - chartWidth - margins['left'];
    }
    var chartHeight = config['height'];
//    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
//    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain([startLabel, endLabel])
        .range([0, chartWidth])

    var min = d3.min(config['data'], function(d) {
        var rowMin = d3.min([d[startColumn], d[endColumn]]);
        return Math.floor(rowMin / roundTicksFactor) * roundTicksFactor;
    });

    var max = d3.max(config['data'], function(d) {
        var rowMax = d3.max([d[startColumn], d[endColumn]]);
        return Math.ceil(rowMax / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([0, 40])
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
                return 'line ' + classify(d[labelColumn]) + ' ' + d['change'];
            })
            .attr('x1', xScale(startLabel))
            .attr('y1', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('x2', xScale(endLabel))
            .attr('y2', function(d) {
                return yScale(d[endColumn]);
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
                return classify(d[labelColumn]) + ' ' + d['change'];
            })
            .attr('r', dotRadius);

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
                return classify(d[labelColumn]) + ' ' + d['change'];
            })
            .attr('r', dotRadius);

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
                    var yPos = yScale(d[startColumn]);
                    yPos += checkLabelOffsets(d[labelColumn], 'start', config['chart']);
                    return yPos;
                })
            .attr('text-anchor', 'end')
            .attr('dx', -6)
            .attr('dy', 3)
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                if (isSidebar) {
                    return d[startColumn].toFixed(0) + '%';
                }

                return d[startColumn].toFixed(0) + '%';
            });

    chartElement.append('g')
        .attr('class', 'value end')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(endLabel))
            .attr('y', function(d) {
                    var yPos = yScale(d[endColumn]);
                    yPos += checkLabelOffsets(d[labelColumn], 'end', config['chart']);
                    return yPos;
                })
            .attr('text-anchor', 'begin')
            .attr('dx', 6)
            .attr('dy', 3)
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                if (isSidebar) {
                    return d[endColumn].toFixed(0) + '%';
                }

                return d[endColumn].toFixed(0) + '%';
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
                    var yPos = yScale(d[endColumn]);
                    yPos += checkLabelOffsets(d[labelColumn], 'end', config['chart']);
                    return yPos;
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
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

var checkLabelOffsets = function(demo, position, chart) {
    var labelOffsets = eval('labelOffsets' + chart);

    if (typeof labelOffsets[demo] != 'undefined') {
        return labelOffsets[demo][position];
    } else {
        return 0;
    }
}
/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
