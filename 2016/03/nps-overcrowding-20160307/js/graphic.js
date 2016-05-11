// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

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
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    TIME.forEach(function(d) {
        d['label'] = d3.time.format('%Y').parse(d['label']);

        for (var key in d) {
            if (key != 'label') {
                d[key] = +d[key];
            }
        }
    });

    DATA.forEach(function(d) {
        d['date'] = d3.time.format('%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': DATA.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
    // filter out empty data. uncomment this if you have inconsistent data.
    //        }).filter(function(d) {
    //            return d['amt'].length > 0;
            })
        });
    }
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
    var yAxisWidth = 35;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = Math.floor((containerWidth - gutterWidth - yAxisWidth) / 2);
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - (gutterWidth * 2) - yAxisWidth) / 3);
    }

    // Render the chart!
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    var parkList = _.pluck(dataSeries, 'name');
    var roundTicksFactor = 1000000;

    parkList.forEach(function(d,i) {
        var p = classify(d);
        var pData = dataSeries.filter(function(v,k) {
            return v['name'] == d;
        });
        var showYAxis = false;
        if (((isMobile && (i % 2 == 0)) || (!isMobile && i % 3 == 0))) {
            showYAxis = true;
        }

        var margins = {
            top: 5,
            right: 0,
            bottom: 20,
            left: 0
        };
        if (showYAxis) {
            margins['left'] = yAxisWidth;
        }

        var thisGraphicWidth = graphicWidth;
        if (showYAxis) {
            thisGraphicWidth += yAxisWidth;
        }

        var pElement = containerElement.append('div')
            .attr('class', 'park ' + p)
            .attr('style', 'width: ' + thisGraphicWidth + 'px;');

        pElement.append('h3')
            .attr('style', 'margin-left: ' + margins['left'] + 'px;')
            .text(d);

        // pElement.append('h4')
        //     .attr('style', 'margin-left: ' + margins['left'] + 'px;')
        //     .text('Recreational visits');
        //
        pElement.append('div')
            .attr('class', 'totals ' + p);

        var totalsAspectHeight = 3;
        // var totalsDomain = [ 0, 6000000 ];
        // var totalsTickValues = [ 0, 2000000, 4000000, 6000000 ];
        //
        // if ((isMobile && i < 2) || !isMobile && i < 3) {
            // totalsAspectHeight = 5.5;
            totalsDomain = [ 0, 12000000 ];
            totalsTickValues = [ 0, 3000000, 6000000, 9000000, 12000000 ];
        // }

        renderLineChart({
            container: '.totals.' + p,
            width: thisGraphicWidth,
            domain: totalsDomain,
            aspectHeight: totalsAspectHeight,
            tickValues: totalsTickValues,
            margins: margins,
            showYAxis: showYAxis,
            data: pData
        });

        pElement.append('p')
            .attr('class', 'summary')
            .attr('style', 'margin-left: ' + margins['left'] + 'px;')
            .html(function() {
                var val2015 = pData[0]['values'][10]['amt'] / 1000000;
                var pctChange = ((pData[0]['values'][10]['amt'] - pData[0]['values'][0]['amt']) / pData[0]['values'][0]['amt']) * 100;
                var t = '';
                t += '<strong>' + val2015.toFixed(1) + '&nbsp;million</strong> visitors in 2015';
                t += ' (up ' + pctChange.toFixed(0) + '% since&nbsp;2005)';
                return t;
            });

        pElement.append('h4')
            .attr('style', 'margin-left: ' + margins['left'] + 'px;')
            .text('Year-To-Year Change');

        pElement.append('div')
            .attr('class', 'change ' + p);

        var changeAspectHeight = 1;
        if (isMobile) {
            changeAspectHeight = 1.5
        }

        renderColumnChart({
            container: '.change.' + p,
            width: thisGraphicWidth,
            domain: [ -20, 20 ],
            aspectHeight: changeAspectHeight,
            tickValues: [ -20, 0, 20 ],
            margins: margins,
            showYAxis: showYAxis,
            data: TIME,
            valueColumn: d
        });
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

    var aspectWidth = 4;
    var aspectHeight = config['aspectHeight'];

    var margins = config['margins'];

    var ticksX = 5;
    var ticksY = 5;

    // Mobile
    if (isMobile) {
        ticksY = 3;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain(config['domain'])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([ COLORS['teal4'] ]);

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

    chartElement.append('rect')
        .attr('class', 'bg')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', chartWidth)
        .attr('height', chartHeight);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            return '\u2019' + fmtYearAbbrev(d);
            // if (isMobile) {
            // } else {
            //     return fmtYearFull(d);
            // }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickValues(config['tickValues'])
        .tickFormat(function(d,i) {
            if (d == 0) {
                return d;
            } else {
                var val = d/1000000;
                return val.toFixed(0) + 'M';
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    if (config['showYAxis']) {
        chartElement.append('g')
            .attr('class', 'y axis')
            .call(yAxis);
    }

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
        .data(config['data'])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    // chartElement.append('g')
    //     .attr('class', 'value')
    //     .selectAll('text')
    //     .data(config['data'])
    //     .enter().append('text')
    //         .attr('x', function(d, i) {
    //             var last = d['values'][d['values'].length - 1];
    //
    //             return xScale(last[dateColumn]) + 5;
    //         })
    //         .attr('y', function(d) {
    //             var last = d['values'][d['values'].length - 1];
    //
    //             return yScale(last[valueColumn]) + 3;
    //         })
    //         .text(function(d) {
    //             var last = d['values'][d['values'].length - 1];
    //             var value = last[valueColumn];
    //
    //             var label = fmtComma(last[valueColumn].toFixed(0));
    //
    //             return label;
    //         });
}


/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = config['valueColumn'];

    var aspectWidth = 3;
    var aspectHeight = config['aspectHeight'];
    var valueGap = 6;

    var margins = config['margins'];

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

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
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var yScale = d3.scale.linear()
        .domain(config['domain'])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickValues(config['tickValues'])
        .tickFormat(function(d) {
            return fmtComma(d) + '%';
        });

    chartElement.append('rect')
        .attr('class', 'bg')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', chartWidth)
        .attr('height', chartHeight);

    /*
     * Render axes to chart.
     */

    if (config['showYAxis']) {
        chartElement.append('g')
            .attr('class', 'y axis')
            .call(yAxis)
    }

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
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
                return xScale(d[labelColumn]);
            })
            .attr('y', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(0);
                }
                return yScale(d[valueColumn]);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(d[valueColumn]) - yScale(0);
                }

                return yScale(0) - yScale(d[valueColumn]);
            })
            .attr('class', function(d) {
                var c = 'bar bar-' + d[labelColumn];
                if (d[valueColumn] < 0) {
                    c += ' negative';
                } else {
                    c += ' positive';
                }
                return c;
            });

    /*
     * Render 0 value line.
     */
    if (config['domain'][0] < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
