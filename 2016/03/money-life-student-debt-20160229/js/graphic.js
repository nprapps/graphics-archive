// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatLoanData();
        formatBarData();

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
var formatLineData = function() {
    LINE_DATA.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in LINE_DATA[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': LINE_DATA.map(function(d) {
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

var formatLoanData = function() {
    LINE_DATA.forEach(function(d) {
        d['amt'] = +d['amt'];
    });
}

var formatBarData = function() {
    BAR_DATA.forEach(function(d) {
        d['amt'] = +d['amt'];
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

    var containerElement = d3.select('#graphic-wrapper');
    containerElement.html('');

    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'bar-chart');

    containerElement.append('div')
        .attr('class', 'graphic')
        .attr('id', 'line-chart');

    var chart_width = isMobile ? containerWidth : containerWidth / 2;
    // Render the chart!
    renderLoansChart({
        container: '#line-chart',
        width: chart_width,
        data: LINE_DATA
    });

    renderColumnChart({
        container: '#bar-chart',
        width: chart_width,
        data: BAR_DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a column chart.
 */
var renderLoansChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 9;
    var aspectHeight = isMobile ? 3 : 9;
    var valueGap = 3;

    var margins = {
        top: 5,
        right: 35,
        bottom: 20,
        left: 40
    };


    var ticksX = 4;
    var ticksY = 4;
    var roundTicksFactor = 10;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    chartWrapper.append('h3')
        .text('Share of students graduating with loans');

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

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    max = 100;

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        //.ticks(ticksX)
        //.tickSize([6,6])
        //.tickValues([1995,2000,2005,2010,2015])
        .tickFormat(function(d, i) {
            if (d%5 === 0) {
                return parseInt(d);
            } else {
                return '';
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
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

    chartElement.selectAll('g.x.axis g.tick line')
        .attr('y2', function(d,i) {
            if (d%5 === 0) {
                return 6;
            } else {
                return 0;
            }
        });

    chartElement.select('path.domain')
        .attr('d', 'M0,0V0H' + chartWidth + 'V0')

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

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
                var add_class = ' source-' + d['source'];
                return 'bar bar-' + d[labelColumn] + add_class;
            });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d,i) {
                if (i === config['data'].length - 1) {
                    return fmtComma(d[valueColumn].toFixed(1)) + '% projected in ' + parseInt(d[labelColumn],10);
                }
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand());
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dy', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = 0;

                barHeight = yScale(0) - yScale(d[valueColumn]);

                d3.select(this).classed('out', true)
                //return -(textHeight - 8);
                return -5;
            })
            .attr('text-anchor', 'end')
}


/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 9;
    var aspectHeight = isMobile ? 3 : 9;
    var valueGap = 3;

    var margins = {
        top: 5,
        right: 25,
        bottom: 20,
        left: 50
    };


    var ticksX = 4;
    var ticksY = 4;
    var roundTicksFactor = 10000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    chartWrapper.append('h3')
        .text('Average student debt');

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

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        //.ticks(ticksX)
        //.tickSize([6,6])
        //.tickValues([1995,2000,2005,2010,2015])
        .tickFormat(function(d, i) {
            if (d%5 === 0) {
                return parseInt(d);
            } else {
                return '';
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return '$' + fmtComma(d);
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.selectAll('g.x.axis g.tick line')
        .attr('y2', function(d,i) {
            if (d%5 === 0) {
                return 6;
            } else {
                return 0;
            }
        });

    chartElement.select('path.domain')
        .attr('d', 'M0,0V0H' + chartWidth + 'V0')

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

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
                var add_class = ' source-' + d['source'];
                return 'bar bar-' + d[labelColumn] + add_class;
            });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d,i) {
                if (i === config['data'].length - 1) {
                    return '$' + fmtComma(d[valueColumn].toFixed(0)) + ' projected in ' + parseInt(d[labelColumn],10);
                }
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand());
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dy', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = 0;

                barHeight = yScale(0) - yScale(d[valueColumn]);

                d3.select(this).classed('out', true)
                //return -(textHeight - 8);
                return -5;
            })
            .attr('text-anchor', 'end')
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
