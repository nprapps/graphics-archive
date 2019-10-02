// Global config
var SIDEBAR_THRESHOLD = 280;

// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });

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
    DATA.forEach(function(d) {
        d['start'] = +d['start'];
        d['end'] = +d['end'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // Render the chart!
    renderSlopegraph({
        container: '#slopegraph',
        width: containerWidth,
        data: DATA,
        labels: LABELS
    });

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

    var aspectWidth = 5;
    var aspectHeight = 3;

    var margins = {
        top: 30,
        right: 185,
        bottom: 34,
        left: 40
    };

    var ticksX = 2;
    var ticksY = 10;
    var roundTicksFactor = 4;
    var dotRadius = 3;
    var labelGap = 42;

    // Mobile
    if (isSidebar) {
        aspectWidth = 2;
        aspectHeight = 3;
        margins['left'] = 38;
        margins['right'] = 100;
        labelGap = 42;
    } else if (isMobile) {
        aspectWidth = 2.5;
        aspectHeight = 3;
        margins['right'] = 125;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // hard code max chart width
    if (chartWidth >= 380) {
        chartWidth = 380;
        margins['right'] = config['width'] - margins['left'] - chartWidth;
    }



    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

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

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        var rowMax = d3.max([d[startColumn], d[endColumn]]);
        return Math.ceil(rowMax / roundTicksFactor) * roundTicksFactor;
    });

    // hard code max
    if (max <  100) {
        max = 100;
    }

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(config.data.map(function(d) { return d[labelColumn] }))
        .range([ COLORS['teal1'], COLORS['teal3'], COLORS['orange4'], '#aaa', COLORS['yellow3'] ]);


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
    *  Legend
    */
    var legend = containerElement
        .append("ul")
        .attr("class", "key")
        .style("display", function(d) {
            return (!isMobile && !isSidebar) ? "none" : "block";
        })
        .selectAll("g")
        .data(config['data'])
        .enter()
        .append("li")
        .attr("class", function(d) {
            return "key-item " + classify(d[labelColumn]);
        });

    legend.append("b").style("background-color",function(d){
        return colorScale(d[labelColumn]);
    });

    legend.append("label").text(function(d) {
        return d[labelColumn];
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
        bg
    */
    chartElement.append('rect')
        .attr('class', 'background')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        ;

    /*
     * Render axes to chart.
     */
     chartElement.append('g')
        .attr('class', 'x axis')
        .call(xAxisTop)
        // wrap + translate axes labels
        .selectAll(".tick text")
        .call(wrapText, 60, 11)
        .attr('transform', makeTranslate(0, -12));

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis)
        // wrap + translate axes labels
        .selectAll(".tick text")
        .call(wrapText, 60, 11)
        .attr('transform', makeTranslate(0, 8));
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
                return d[startColumn].toFixed(1) + '%';
            })
            // .attr('fill', function(d) {
            //     return colorScale(d[labelColumn]);
            // })
            ;

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
                return d[endColumn].toFixed(1) + '%';
            })
            // .attr('fill', function(d) {
            //     return colorScale(d[labelColumn]);
            // })
            ;

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
            .attr('fill', function(d) {
                return colorScale(d[labelColumn]);
            })
            .text(function(d) {
                var change = Number(d[endColumn]) - Number(d[startColumn]);
                var pointChange = "+" + change.toFixed(1) + " points";
                if (!isMobile && !isSidebar) {
                    return d[labelColumn];
                } else {
                    return pointChange;
                }
            })
            // manual linebreak.
            // there is probably a better way to add this conditionally.
            .append('tspan')
                .attr('x', xScale(endLabel))
                .attr('y', function(d) {
                    yScale(d[endColumn])
                })
                .attr('dx', labelGap)
                .attr('dy', 13)
                .text(function(d) {
                    var change = Number(d[endColumn]) - Number(d[startColumn]);
                    return "+" + change.toFixed(1) + " points";
                })
                .style('display', function(d) {
                    return (!isMobile && !isSidebar) ? "block" : "none";
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
