// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var yearGroupings = [];

/*
 * Initialize the graphic.
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
    var thisYear = null;
    var numCandidates = null;
    var counter = 0;

    graphicData.forEach(function(d, i) {
        d['values'] = [];
        
        if (thisYear != null && thisYear != d['year']) {
            yearGroupings.push({ 'year': thisYear,
                                 'numCandidates': numCandidates,
                                 'counter': counter
                               });
            numCandidates = 0;
            counter = i;
        }
        
        thisYear = d['year'];
        numCandidates++;

        if (i == (graphicData.length - 1)) {
            yearGroupings.push({ 'year': thisYear,
                                 'numCandidates': numCandidates,
                                 'counter': counter
                               });
        }
        
        for (var key in d) {
            if (key != 'Favorable' && key != 'Unfavorable' && key != 'Net') {
                continue;
            }
            
            d[key] = +d[key];
            
            d['values'].push({
                'name': key,
                'x0': 0,
                'x1': d[key],
                'val': d[key]
            })
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
    renderStackedBarChart({
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
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 20;
    var barGap = 4;
    var yearWidth = 40;
    var labelWidth = 60;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 40,
        right: 10,
        bottom: 20,
        left: yearWidth + (labelWidth + labelMargin)
    };

    var ticksX = [ -80, -60, -40, -20, 0, 20, 40, 60, 80 ];
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksX = [ -80, -40, 0, 40, 80 ];
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
     var xScale = d3.scale.linear()
         .domain([ -80, 80 ])
         .rangeRound([0, chartWidth]);

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
        .tickValues(ticksX)
        .tickFormat(function(d) {
            return d + '%';
        });
    var xAxisTop = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .tickValues(ticksX)
        .tickFormat(function(d) {
            return d + '%';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, -barGap))
        .call(xAxisTop);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    // year backgrounds
    var bars = chartElement.append('g')
        .attr('class', '.bg-bars')
        .selectAll('rect')
            .data(yearGroupings)
        .enter().append('rect')
            .attr('x', -(margins['left']))
            .attr('y', function(d) {
                return (d['counter'] * (barHeight + barGap));
            })
            .attr('width', (margins['left'] + chartWidth))
            .attr('height', function(d) {
                return (d['numCandidates'] * (barHeight + barGap)) - barGap;
            })
            .style('fill', function(d, i) {
               if (i % 2 == 0) {
                    return '#f1f1f1';
                } else {
                    return '#fff';
                }
            });

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d[labelColumn]) + ' ' + classify(d['party']);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }
                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .attr('class', function(d) {
                 return classify(d['name']);
             });

     /*
      * Render bar values.
      */
     containerElement.append('div')
        .attr('class', 'value')
        .attr('style', function() {
            var s = 'position: absolute; '
            s += 'left: ' + margins['left'] + 'px; ';
            s += 'top: ' + margins['top'] + 'px; ';
            return s;
        })
        .attr('transform', makeTranslate(margins['top'], margins['left']))
        .selectAll('div')
            .data(config['data'])
        .enter().append('div')
            .html(function(d) {
                var val = '<strong>Net: ' + d['values'][2]['val'] + '%</strong>';
                if (!isMobile) {
                    val += ' (' + d['values'][0]['val'] + '/' + d['values'][1]['val'] + ')';
                }
                return val;
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('style', function(d, i) {
                var leftPos = null;
                var topPos = ((i * (barHeight + barGap)) + 3);
                var textAlign = 'left';
                var textWidth = 100;
            
                // Negative case
                if (d['values'][2]['val'] < 0) {
                    textAlign = 'right';
                    leftPos = xScale(d['values'][2]['x1']) - textWidth - 6;
                // Positive case
                } else {
                    textAlign = 'left';
                    leftPos = xScale(d['values'][2]['x1']) + 6;
                }

                var s = '';
                s += 'position: absolute; ';
                s += 'left: ' + leftPos + 'px; ';
                s += 'top: ' + topPos + 'px; ';
                s += 'text-align: ' + textAlign + '; ';
                s += 'width: ' + textWidth + 'px; ';
                
                return s;
            })
            .attr('dx', function(d) {
//                 var xStart = xScale(d['val']);
//                 var textWidth = this.getComputedTextLength()
// 
//                 // Negative case
//                 if (d['values'][2]['val'] < 0) {
//                     var outsideOffset = -(valueGap + textWidth);
// 
//                     if (xStart + outsideOffset < 0) {
//                         d3.select(this).classed('in', true)
//                         return valueGap;
//                     } else {
//                         d3.select(this).classed('out', true)
//                         return outsideOffset;
//                     }
//                 // Positive case
//                 } else {
//                     if (xStart + valueGap + textWidth > chartWidth) {
//                         d3.select(this).classed('in', true)
//                         return -(valueGap + textWidth);
//                     } else {
//                         d3.select(this).classed('out', true)
//                         return valueGap;
//                     }
//                 }
            });

     /*
      * Render 0-line.
      */
     chartElement.append('line')
         .attr('class', 'zero-line')
         .attr('x1', xScale(0))
         .attr('x2', xScale(0))
         .attr('y1', 0)
         .attr('y2', chartHeight);

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': yearWidth + 'px'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'width': labelWidth + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap)) + 'px;'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
                });

    // year backgrounds
    chartElement.append('g')
        .attr('class', 'year-labels')
        .selectAll('text')
            .data(yearGroupings)
        .enter().append('text')
            .attr('x', -margins['left'])
            .attr('y', function(d) {
                return (d['counter'] * (barHeight + barGap));
            })
//             .attr('dx', 6)
            .attr('dy', 12)
            .text(function(d) {
                return d['year'];
            });

    /*
     * Render annotations
     */
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');

    annotations.append('text')
        .attr('class', 'label-top')
        .attr('x', xScale(0))
        .attr('dx', -5)
        .attr('text-anchor', 'end')
        .attr('y', -30)
        .html('\u2039 Unfavorable');

    annotations.append('text')
        .attr('class', 'label-top')
        .attr('x', xScale(0))
        .attr('dx', 5)
        .attr('text-anchor', 'begin')
        .attr('y', -30)
        .html('Favorable \u203a');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
