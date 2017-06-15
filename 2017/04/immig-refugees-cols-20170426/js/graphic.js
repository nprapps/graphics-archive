// Global vars
var pymChild = null;
var isMobile = false;
var tickValues = [];

/*
 * Initialize the graphic.
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
    DATA.forEach(function(d) {
        d['amt'] = +d['amt'];
        d['month'] = +d['month'];
        d['year'] = +d['year'];

        if (d['month'] == 1) {
            tickValues.push(d['label']);
        }
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
    renderColumnChart({
        container: '#column-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
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

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;
    var valueGap = 6;
    var labelLineHeight = 13;
    var annotYOffset = -30;

    var margins = {
        top: 5,
        right: 85,
        bottom: 20,
        left: 45
    };

    var ticksY = 6;
    var roundTicksFactor = 1000;

    if (isMobile) {
        margins['left'] = 26;
        margins['right'] = 65;
        labelLineHeight = 11;
        annotYOffset = -25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

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
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    if (isMobile) {
        xScale.rangeBands([0, chartWidth], 0);
    } else {
        xScale.rangeRoundBands([0, chartWidth], .1);
    }

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
        .tickValues(tickValues)
        .tickFormat(function(d, i) {
            return '';
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d == 0 || !isMobile) {
                return fmtComma(d);
            } else if (isMobile) {
                var val = d / 1000;
                return val.toFixed(0) + 'k';
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.selectAll('.x.axis .tick line')
        .attr('x1', function(d) {
            var xPos = -xScale.rangeBand() / 2;
            return xPos;
        })
        .attr('x2', function(d) {
            var xPos = -xScale.rangeBand() / 2;
            return xPos;
        });

    var yearLabels = chartElement.append('g')
        .attr('class', 'years');
    yearLabels.selectAll('text')
        .data(config['data'].filter(function(d) {
            return d['month'] == 6;
        }))
        .enter()
            .append('text')
            .text(function(d) {
                return d['year'];
            })
            .attr('x', function(d) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', chartHeight + 13);
    yearLabels.append('text')
        .text('2017')
        .attr('x', function() {
            console.log(xScale('1/2017'));
            return xScale('1/2017') + (xScale.rangeBand() / 2);
        })
        .attr('y', chartHeight + 13)
        .attr('class', 'y-2017');

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
                return 'bar y-' + d['year'].toFixed(0);
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

    // annotations
    var lastBar = config['data'][config['data'].length - 1];
    var annot = chartElement.append('g')
        .attr('class', 'annotations');
    annot.append('line')
        .attr('x1', xScale(lastBar[labelColumn]) + xScale.rangeBand())
        .attr('x2', chartWidth + 6)
        .attr('y1', yScale(lastBar[valueColumn]) + 5)
        .attr('y2', yScale(lastBar[valueColumn]) + 5);
    annot.append('text')
        .text(fmtComma(lastBar[valueColumn]) + ' refugees admitted in March 2017')
        .attr('x', chartWidth + 12)
        .attr('y', yScale(lastBar[valueColumn]) + annotYOffset)
        .call(wrapText, margins['right'] - 12, labelLineHeight);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
