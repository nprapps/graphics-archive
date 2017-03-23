// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 550;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
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

    var graphicWidth = null;
    var gutterWidth = 22;
    var numAcross = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        numAcross = 2;
        isMobile = true;
    } else {
        numAcross = 5;
        isMobile = false;
    }
    graphicWidth = Math.floor((containerWidth - (gutterWidth * (numAcross - 1))) / numAcross);

    // Render the chart!
    var graphicElement = d3.select('#graphic');
    graphicElement.html('');

    var categories = _.pluck(graphicData, 'label');
    var yDomain = [ 0, 100 ];

    for (var c in categories) {
//         if (categories[c] != 'Other') {
            var cData = graphicData.filter(function(d) {
                return d['label'] == categories[c];
            });

            var chartWrapper = graphicElement.append('div')
                .attr('class', 'category')
                .attr('id', function(d) {
                    return classify(categories[c]);
                })
                .attr('style', function(d) {
                    var s = 'width: ' + graphicWidth + 'px;'
                    if (isMobile && (c % 2 == 1)) {
                        s += 'margin-left: ' + gutterWidth + 'px;';
                    } else if (!isMobile && c != 0) {
                        s += 'margin-left: ' + gutterWidth + 'px;';
                    }
                    return s;
                });

            renderSlopegraph({
                container: '#' + classify(categories[c]),
                width: graphicWidth,
                data: cData,
                category: categories[c],
                metadata: GRAPHIC_METADATA,
                yDomain: yDomain
            });
//         }
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
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

    var aspectWidth = 3;
    var aspectHeight = 4;

    if (isMobile) {
        aspectHeight = 3;
    }

    var margins = {
        top: 0,
        right: 30,
        bottom: 20,
        left: 30
    };

    var ticksX = 2;
    var ticksY = 10;
    var roundTicksFactor = 4;
    var dotRadius = 3;
    var labelGap = 42;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .attr('style', function() {
            var s = '';
            s += 'margin-left: ' + margins['left'] + 'px;';
            s += 'margin-right: ' + margins['right'] + 'px;';
            return s;
        })
        .text(config['category']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain([startLabel, endLabel])
        .range([0, chartWidth])

    var yScale = d3.scale.linear()
        .domain(config['yDomain'])
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

    // backgrounds
    chartElement.append('rect')
        .attr('class', 'bg')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', chartWidth)
        .attr('height', chartHeight);

    /*
     * Render axes to chart.
     */
//      chartElement.append('g')
//          .attr('class', 'x axis')
//          .call(xAxisTop);

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Draw area
     */
    var area = d3.svg.area()
        .x(function(d) {
            return d['x'];
        })
        .y0(chartHeight)
        .y1(function(d) {
            return d['y'];
        });

    var coordinates = [];
    for (var i = 0; i < config['data'].length; i++) {
        d = config['data'][i];
        var gutter = (xScale.rangeBand() * .1) / 2;
        coordinates.push({ 'x': xScale(xScale.domain()[0]),
                           'y': yScale(d[startColumn]) });
        coordinates.push({ 'x': xScale(xScale.domain()[1]),
                           'y': yScale(d[endColumn]) });
    }
    // console.log(coordinates);

    chartElement.append('g')
        .attr('class', 'area')
        .selectAll('path')
        .data([coordinates])
        .enter().append('path')
            .attr('class', 'overall')
            .attr('d', area(coordinates))
            .attr('fill', colorScale.range()[0]);


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
