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
        d['range'] = +d['range'];

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

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

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
    var dateColumn = 'range';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 25,
        right: 75,
        bottom: 45,
        left: 50
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;

        margins['top'] = 10;
        margins['right'] = 25;
        margins['left'] = 45;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var formattedData = {};

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in graphicData[0]) {
        if (column == dateColumn) {
            continue;
        }

        formattedData[column] = graphicData.map(function(d) {
            return {
                'range': d[dateColumn],
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
        .domain(d3.extent(config['data'], function(d) {
            return d[dateColumn];
        }))
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ 0,2200])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(key) {
            return key !== dateColumn;
        }))
        .range([ COLORS['blue4'], COLORS['blue1'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(d3.entries(formattedData))
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d['key']);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d['key']);
        });

    legend.append('label')
        .text(function(d) {
            return d['key'];
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
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX);
        // .tickFormat(function(d, i) {
        //     if (isMobile) {
        //         return '\u2019' + fmtYearAbbrev(d);
        //     } else {
        //         return fmtYearFull(d);
        //     }
        // });

    var tickValuesY = isMobile ? [0,400,800,1200,1600,2000] : [0,200,400,600,800,1000,1200,1400,1600,1800,2000,2200]
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickValues(tickValuesY);

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

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .interpolate('step-before')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    var areas = d3.svg.area()
        .interpolate('step-before')
        .x(function(d) {return xScale(d[dateColumn]);})        
        .y0(function(d) { return yScale(0); })
        .y1(function(d) {return yScale(d[valueColumn]);});


    chartElement.append('g')
        .attr('class', 'area')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                    return 'area area-' + i + ' ' + classify(d['key']);
                })
                .attr('d', function(d) {
                    return areas(d['value']);
                })
        .style("fill", COLORS['blue3']);            

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



    if (!isMobile) {
    chartElement
        .append('text')
        .attr('class','axis')
        .attr('x', xScale(-160))
        .attr('y', yScale(2300))
        // .attr('dy', -8 )
        // .attr('dx', -3)
        .attr('text-anchor', 'start')
        .text('Number Of Guesses')
    } 

    chartElement
        .append('text')
        .attr('class','axis')
        .attr('text-anchor', 'middle')
        .attr('transform', 'translate(' + chartWidth/2 + ',' + chartHeight + ')')
        .attr('dy', 40)
        .text('Weight (in lbs)')    

    if (!isMobile) {
    var imageSize = chartWidth/3
    chartElement.append('svg:image')
        .attr('class', 'chart-image')
        .attr('transform', 'translate(0,-10)')
        .attr('xlink:href', 'cow-image.png')    
        .attr('width', imageSize)
        .attr('height', imageSize)
        .attr('x', xScale(2100))    
        .attr('y', yScale(2000));

    chartElement
        .append('text')
        .attr('class','penelope')
        .attr('x', xScale(2100)+imageSize/2)
        .attr('y', yScale(2000)+imageSize)
        .attr('dy', 15 )
        .attr('text-anchor', 'middle')
        .text('Penelope The Cow')

    chartElement
        .append('line')
        .attr('class','v-line')
        .attr('x1', xScale(1287))
        .attr('y1', yScale(0))
        .attr('x2', xScale(1287))
        .attr('y2', yScale(2125))
        .style('stroke', '#ACACAC')
        .style('stroke-width', '1px')
        .style('stroke-dasharray', '2px')     

    chartElement
        .append('line')
        .attr('class','v-line')
        .attr('x1', xScale(1355))
        .attr('y1', yScale(0))
        .attr('x2', xScale(1355))
        .attr('y2', yScale(2050))
        .style('stroke', '#ACACAC')
        .style('stroke-width', '1px')

    chartElement
        .append('text')
        .attr('class','axis')
        .attr('x', xScale(1287))
        .attr('dx','-3px' )
        .attr('y', yScale(2135))
        .attr('text-anchor', 'end')
        .text('Average Guess: 1,287 lbs')


    chartElement
        .append('text')
        .attr('class','axis')
        .attr('x', xScale(1337))
        .attr('dy','-3px' )
        .attr('y', yScale(2050))
        .attr('text-anchor', 'start')
        .text('Actual Weight: 1,355 lbs')        

    } else {

    chartElement
        .append('line')
        .attr('class','v-line')
        .attr('x1', xScale(1287))
        .attr('y1', yScale(0))
        .attr('x2', xScale(1287))
        .attr('y2', yScale(2000))
        .style('stroke', '#ACACAC')
        .style('stroke-width', '1px')
        .style('stroke-dasharray', '2px')     

    chartElement
        .append('line')
        .attr('class','v-line')
        .attr('x1', xScale(1355))
        .attr('y1', yScale(0))
        .attr('x2', xScale(1355))
        .attr('y2', yScale(1600))
        .style('stroke', '#ACACAC')
        .style('stroke-width', '1px')


    chartElement
        .append('text')
        .attr('class','axis')
        .attr('x', xScale(1287))
        .attr('dx','-4px' )
        .attr('y', yScale(2155))
        .attr('text-anchor', 'end')
        .text('Average Guess:')
    
    chartElement
        .append('text')
        .attr('class','axis')
        .attr('x', xScale(1287))
        .attr('dx','-4px' )
        .attr('dy','10px' )
        .attr('y', yScale(2155))
        .attr('text-anchor', 'end')
        .text('1,287 lbs')

    chartElement
        .append('text')
        .attr('class','axis')
        .attr('x', xScale(1337))
        .attr('dx','3px' )
        .attr('y', yScale(1750))
        .attr('text-anchor', 'start')
        .text('Actual Weight: 1,355 lbs')      
    chartElement
        .append('text')
        .attr('class','axis')
        .attr('x', xScale(1337))
        .attr('dx','3px' )
        .attr('dy','10px' )
        .attr('y', yScale(1750))
        .attr('text-anchor', 'start')
        .text('1,355 lbs')        

    }

  
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
