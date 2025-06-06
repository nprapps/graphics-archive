// Global vars
var pymChild = null;
var isMobile = false;

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
        for (key in d) {
            if (key == 'label') {
                continue;
            }

            d[key] = +d[key];
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
    renderDotChart({
        container: '#dot-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 */
var renderDotChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';
    var minColumn = 'Fathers';
    var maxColumn = 'Mothers';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 140;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;

    var margins = {
        top: 0,
        right: 35,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 20;

    if (isMobile) {
        ticksX = 6;
        labelWidth = 70;
        barHeight = 40;
        margins['left'] = (labelWidth + labelMargin);
        margins['right'] = 60;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

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
    var min = 0;
    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[maxColumn] / roundTicksFactor) * roundTicksFactor;
    });

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
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
     * Render range bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', function(d, i) {
                return xScale(d[minColumn]);
            })
            .attr('x2', function(d, i) {
                return xScale(d[maxColumn]);
            })
            .attr('y1', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('y2', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            });

    /*
     * Render dots to chart.
     */
    for (key in config['data'][0]) {
        if (key == 'label') {
            continue;
        }

        chartElement.append('g')
            .attr('class', 'dots ' + classify(key))
            .selectAll('circle')
            .data(config['data'])
            .enter().append('circle')
                .attr('cx', function(d, i) {
                    return xScale(d[key]);
                })
                .attr('cy', function(d, i) {
                    return i * (barHeight + barGap) + (barHeight / 2);
                })
                .attr('r', dotRadius);
    }

    /*
     * Render bar labels.
     */
    containerElement
        .append('ul')
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
                .html(function(d) {
                    return d[labelColumn];
                });

    /*
     * Render bar values.
     */
    for (key in config['data'][0]) {
        if (key == 'label') {
            continue;
        }
    // _.each(['shadow', 'value'], function(cls) {
        chartElement.append('g')
            .attr('class', 'value ' + classify(key))
            .selectAll('text')
            .data(config['data'])
            .enter().append('text')
                .attr('x', function(d, i) {
                    return xScale(d[key]);
                })
                .attr('dx', function() {
                    switch(key) {
                        case 'Mothers':
                            return dotRadius + 6;
                            break;
                        case 'Fathers':
                            return -(dotRadius + 6);
                            break;
                    }
                })
                .attr('y', function(d,i) {
                    return i * (barHeight + barGap) + (barHeight / 2) + 3;
                })
                .text(function(d, i) {
                    var val = d[key].toFixed(0) + '%';
                    if (i == 0) {
                        switch(key) {
                            case 'Mothers':
                                val += ' ' + key;
                                break;
                            case 'Fathers':
                                val = key + ' ' + val;
                                break;
                        }
                    }
                    return val;
                });
    };
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
