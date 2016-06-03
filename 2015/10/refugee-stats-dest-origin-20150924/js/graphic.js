// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var MIDDLE_THRESHOLD = 600;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
var fmtComma = d3.format(',');

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
    for (series in graphicData) {
        graphicData[series]['data'].forEach(function(d,i) {
            d['amt'] = +d['amt'];
        });
    }
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }
    
    var numCols = 3;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 1;
    } else if (containerWidth > MOBILE_THRESHOLD && containerWidth <= MIDDLE_THRESHOLD) {
        numCols = 2;
    } else {
        isMobile = false;
    }
    
    var smallChartWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1))) / numCols);

    var containerElement = d3.select('#graphic');
    containerElement.html('');

    // Render the chart!
    for (series in graphicData) {
        var chartWrapper = containerElement.append('div')
            .attr('id', classify(series))
            .attr('class', 'chart');
        
        // identify what countries we have
        var countries = d3.map(graphicData[series]['data'], function(d){
            return d['origin'];
        }).keys();
            
        countries.forEach(function(d, i) {
            var c = countries[i];
        
            chartWrapper.append('div')
                .attr('id', classify(c))
                .attr('class', 'chart-small')
                .attr('style', function() {
                    var s = '';
                    s += 'width: ' + smallChartWidth + 'px;';
                    if (i % numCols != 0) {
                        s += 'margin-left: ' + gutterWidth + 'px;';
                    } else {
                        s += 'clear: both;'
                    }
                    return s;
                });
        
            var chartData = graphicData[series]['data'].filter(function(f) {
                return f['origin'] == c;
            });

            renderBarChart({
                container: '#' + classify(c),
                width: smallChartWidth,
                title: c,
                data: chartData,
                domain: [ 0, 100 ],
                chartType: 'small',
                units: 'pct'
            });
        });
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 80;
    var labelMargin = 6;
    var valueGap = 6;

    var ticksX = 2;
    var roundTicksFactor = 5;
    
    var margins = {
        top: 0,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Define container element
    var containerElement = d3.select(config['container']);
    
    // Add country label
    if (config['title'] == 'Palestinian') {
        containerElement.append('h4')
            .html('<span>' + config['title'] + '</span> refugees and asylum-seekers have gone&nbsp;to:');
    } else {
        containerElement.append('h4')
            .html('Refugees and asylum-seekers from <span>' + config['title'] + '</span> have gone&nbsp;to:');
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

    /*
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var xScale = d3.scale.linear()
        .domain(config['domain'])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            if (config['units'] == 'pct') {
                return d + '%';
            } else {
                if (d >= 1000000) {
                    return (d / 1000000).toFixed(0) + ' million';
                } else {
                    return fmtComma(d.toFixed(0));
                }
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

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
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
            });

    /*
     * Render 0-line.
     */
//     chartElement.append('line')
//         .attr('class', 'zero-line')
//         .attr('x1', xScale(0))
//         .attr('x2', xScale(0))
//         .attr('y1', 0)
//         .attr('y2', chartHeight);

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
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

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d) {
                if (config['units'] == 'pct') {
                    var amt = d[valueColumn].toFixed(0);
                    if (d[valueColumn] > 0 && amt == 0) {
                        return '< 1%';
                    } else {
                        return d[valueColumn].toFixed(0) + '%';
                    }
                } else {
                    if (d[valueColumn] >= 1000000) {
                        return (d[valueColumn] / 1000000).toFixed(2) + ' million';
                    } else {
                        return fmtComma(d[valueColumn].toFixed(0));
                    }
                }
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()

                // Negative case
                if (d[valueColumn] < 0) {
                    var outsideOffset = -(valueGap + textWidth);

                    if (xStart + outsideOffset < 0) {
                        d3.select(this).classed('in', true)
                        return valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return outsideOffset;
                    }
                // Positive case
                } else {
                    if (xStart + valueGap + textWidth > chartWidth) {
                        d3.select(this).classed('in', true)
                        return -(valueGap + textWidth);
                    } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    }
                }
            })
            .attr('dy', (barHeight / 2) + 3)
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
