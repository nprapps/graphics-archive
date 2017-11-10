// Global vars
var pymChild = null;
var isMobile = false;

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
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

// /*
//  * Load graphic data from a CSV.
//  */
// var loadCSV = function(url) {
//     d3.csv(GRAPHIC_DATA_URL, function(error, data) {
//         graphicData = data;
//
//         formatData();
//
//         pymChild = new pym.Child({
//             renderCallback: render
//         });
//     });
// }

/*
 * Format graphic data for processing by D3.
 */
 var formatData = function() {
     DATA.forEach(function(d) {
         // console.log(d);
         d['trump'] = +d['trump'];
         d['discrimination'] = +d['discrimination'];

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

    // Render the chart!
    renderLineChart({
        container: '#graphic',
        width: containerWidth,
        data: DATA
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
    var xColumn = 'trump';
    var yColumn = 'discrimination';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 25,
        bottom: 40,
        left: 70
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 30;
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

    var xScale = d3.scale.linear()
        .domain([25, 75])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ 25, 50 ])
        .range([ chartHeight, 0 ]);

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
     * Create SVG filters.
     */
    var filters = chartElement.append('filters');

    var textFilter = filters.append('filter')
        .attr('id', 'textshadow');

    textFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('result', 'blurOut')
        .attr('stdDeviation', '.25');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d + '%'
        })

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d + '%'
        })

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

    chartElement.append("text")
        .attr("class", "x axis-label")
        .attr("text-anchor", "middle")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 35)
        .text("2016 Trump Vote");

    chartElement.append("text")
        .attr("class", "y axis-label")
        .attr("text-anchor", "middle")
        .attr("y", -60)
        .attr("dy", ".75em")
        .attr("x", -(chartHeight / 2))
        .attr("transform", "rotate(-90)")
        .text("% Saying Discrimination Prevalent");

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
     * Add best-fit line.
     */

    chartElement.append("line")
        .attr("x1", xScale(25))
        .attr("y1", yScale(48.25))
        .attr("x2", xScale(75))
        .attr("y2", yScale(29.75))
        .style("stroke", '#bbb')
        .style('stroke-width', '2');

    /*
     * Render dots to chart.
     */
     chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('fill', function(d) {
                return COLORS['teal3']
            })
            .attr('r', 4)
            .attr('cx', function(d) {
                return xScale(d[xColumn]);
            })
            .attr('cy', function(d) {
                return yScale(d[yColumn]);
            })
            .attr('class', function(d) {
                if (d['highlight']) {
                    return 'highlight';
                }

                return '';
            });

    /*
     * Add text shadow.
     */

    /*
     * Render labels.
     */
     var highlights = _.filter(config['data'], function(d) {
         return d['highlight'] !== null;
     })

     chartElement.append('g')
         .attr('class', 'label')
         .selectAll('text')
         .data(highlights)
         .enter().append('text')
             .attr('x', function(d) {
                 if (d['state'] === 'California') {
                        if (!isMobile) {
                            return xScale(d[xColumn]) - 60;
                        } else {
                            return xScale(d[xColumn]) - 35;
                        }
                    } else {
                     return xScale(d[xColumn]) + 8;
                 }
             })
             .attr('y', function(d) {
                 if (d['candidate'] === 'California') {
                     return yScale(d[yColumn]) - 10;
                 } else {
                     return yScale(d[yColumn]) - 0;
                 }
             })

             .text(function(d) {
                 if (!isMobile) {
                     return d['state'];
                 } else {
                     return d['abbrev'];
                 }
             });

 }

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
