// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

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
        d['date'] = d3.time.format('%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date') {
                d[key] = +d[key];
            }
        }
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

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - 11) / 2);
    }

    var containerElement = d3.select('#graphic');
    containerElement.html('');
    
    var fullDomain = d3.extent(graphicData, function(d) {
            return d['date'];
        });

    var earlyDomain = [ d3.time.format('%Y').parse('1924'),
                        d3.time.format('%Y').parse('1960') ];

    var lateDomain  = [ d3.time.format('%Y').parse('1945'),
                        d3.time.format('%Y').parse('2011') ];
    
    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(graphicData[0]).filter(function(key) {
            return key !== 'date';
        }))
        .range([ '#666', '#888', COLORS['orange4'], COLORS['red3'], '#444' ]);


    // Render the chart!
    containerElement.append('div')
        .attr('id', 'time-early');
    containerElement.append('div')
        .attr('id', 'time-late');

    if (isMobile) {
        d3.select('#time-early')
            .style('width', graphicWidth + 'px;');
        d3.select('#time-late')
            .style('width', graphicWidth + 'px;');
    }
    
    renderLineChart({
        container: '#time-early',
        width: graphicWidth,
        xDomain: earlyDomain,
        lateDomain: lateDomain,
        yDomain: [ 0, 50 ],
        colorScale: colorScale,
        title: HED_EARLY,
        data: graphicData
    });

    renderLineChart({
        container: '#time-late',
        width: graphicWidth,
        xDomain: lateDomain,
        earlyDomain: earlyDomain,
        yDomain: [ 0, 1000 ],
        colorScale: colorScale,
        title: HED_LATE,
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
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 20,
        bottom: 20,
        left: 35
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 100;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');
    
    containerElement.append('h3')
        .text(config['title']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(config['xDomain'])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain(config['yDomain'])
        .range([ chartHeight, 0 ]);

    var colorScale = config['colorScale'];

    /*
     * Restructure tabular data for easier charting.
     */
    var formattedData = {};
    for (var column in graphicData[0]) {
        if (column == dateColumn) {
            continue;
        }

        formattedData[column] = graphicData.map(function(d) {
            return {
                'date': d[dateColumn],
                'amt': d[column]
            };
// filter out empty data. uncomment this if you have inconsistent data.
        }).filter(function(d) {
           return d['date'] >= xScale.domain()[0] && d['date'] <= xScale.domain()[1];
        });
    }


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


    var hatchMarks = chartElement.append('defs')
        .append('pattern')
            .attr('id', 'diagonalHatch')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 4)
            .attr('height', 4)
        .append('path')
            .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
            .attr('stroke', '#ebebeb')
            .attr('stroke-width', 1);   

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

    /*
     * Render axes to chart.
     */
    if (config['container'] == '#time-late') {
        chartElement.append('rect')
            .attr('class', 'bg')
            .attr('x', 0)
            .attr('width', xScale(config['earlyDomain'][1]) - xScale(config['xDomain'][0]))
            .attr('y', 0)
            .attr('height', chartHeight)
            .style('fill', 'url(#diagonalHatch)');
    } else if (config['container'] == '#time-early') {
        chartElement.append('rect')
            .attr('class', 'bg')
            .attr('x', xScale(config['lateDomain'][0]))
            .attr('width', xScale(config['xDomain'][1]) - xScale(config['lateDomain'][0]))
            .attr('y', 0)
            .attr('height', chartHeight)
            .style('fill', 'url(#diagonalHatch)');
    }

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

    /*
     * Render lines to chart.
     */
    var area = d3.svg.area()
        .x(function(d) { 
            return xScale(d[dateColumn]);
        })
        .y0(chartHeight)
        .y1(function(d) { 
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'area')
        .selectAll('path')
            .data(d3.entries(formattedData))
        .enter().append('path')
            .attr('fill', function(d) {
                return colorScale(d['key']);
            })
            .attr('d', function(d) {
                return area(d['value']);
            });

    var line = d3.svg.line()
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
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });
            
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');

    if (config['container'] == '#time-early') {
        annotations.append('text')
            .attr('x', xScale(formattedData['wetback'][30]['date']))
            .attr('y', yScale(formattedData['wetback'][30]['amt']))
            .attr('dx', 0)
            .attr('dy', -8)
            .attr('fill', colorScale('wetback'))
            .text('wetback');

        annotations.append('text')
            .attr('x', xScale(formattedData['undesirable'][9]['date']))
            .attr('y', yScale(formattedData['undesirable'][9]['amt']))
            .attr('dx', 0)
            .attr('dy', -12)
            .attr('fill', colorScale('undesirable'))
            .text('undesirable');
    }

    if (config['container'] == '#time-late') {
        annotations.append('text')
            .attr('class', classify('wetback'))
            .attr('x', xScale(formattedData['wetback'][9]['date']))
            .attr('y', yScale(formattedData['wetback'][9]['amt']))
            .attr('dx', 0)
            .attr('dy', -8)
            .attr('fill', colorScale('wetback'))
            .text('wetback');
        annotations.append('text')
            .attr('class', classify('illegal alien'))
            .attr('x', xScale(formattedData['illegal alien'][33]['date']))
            .attr('y', yScale(formattedData['illegal alien'][33]['amt']))
            .attr('dx', 0)
            .attr('dy', -20)
            .attr('fill', colorScale('illegal alien'))
            .text('illegal alien');
        annotations.append('text')
            .attr('class', classify('illegal immigrant'))
            .attr('x', xScale(formattedData['illegal immigrant'][49]['date']))
            .attr('y', yScale(formattedData['illegal immigrant'][49]['amt']))
            .attr('dx', -6)
            .attr('dy', -12)
            .attr('fill', colorScale('illegal immigrant'))
            .text('illegal immigrant');
        annotations.append('text')
            .attr('class', classify('undocumented'))
            .attr('x', xScale(formattedData['undocumented'][55]['date']))
            .attr('y', yScale(formattedData['undocumented'][55]['amt']))
            .attr('dx', 20)
            .attr('dy', -23)
            .attr('fill', colorScale('undocumented'))
            .text('undocumented');
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
