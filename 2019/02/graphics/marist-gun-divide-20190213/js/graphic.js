// Global vars
var pymChild = null;
var isMobile = false;
var isPromo = false;
var skipLabels = [ 'label', 'label_display' ];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (d3.select('body').classed('promo')) {
        isPromo = true;
    }

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });

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
            if (!_.contains(skipLabels, key)) {
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
    var categories = d3.keys(config['data'][0]).filter(function(d) {
        if (!_.contains(skipLabels, d)) {
            return d;
        }
    });

    var labelColumn = 'label';
    var valueColumn = 'amt';
    var minColumn = categories[0];
    var maxColumn = categories[1];

    var barHeight = 35;
    var barGap = 5;
    var labelWidth = 280;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;

    var tickValues = [ 0, 20, 40, 60, 80, 100 ];

    var margins = {
        top: 20,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    if (isMobile) {
        barHeight = 65;
        labelMargin = 20;
        labelWidth = 120;
        margins['left'] = (labelWidth + labelMargin);
        margins['right'] = 25;
        tickValues = [ 0, 25, 50, 75, 100 ];
    }

    if (isPromo) {
        barHeight = 35;
        labelWidth = 100;
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
    var max = 100;

    var xScale = d3.scale.linear()
        .domain([ min, max ])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(tickValues)
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
    var dots = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('g')
        .data(categories)
        .enter().append('g')
            .attr('class', function(d) {
                return classify(d);
            });
    dots.selectAll('circle')
        .data(function(d, i) {
            var dotData = _.pluck(config['data'], d);
            return dotData;
        })
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d);
            })
            .attr('cy', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('r', dotRadius);

    /*
     * Render dot values.
     */
    _.each(['shadow', 'value'], function(cls) {
        var dotValues = chartElement.append('g')
            .attr('class', cls)
            .selectAll('g')
            .data(categories)
            .enter().append('g')
                .attr('class', function(d, i) {
                    return classify(d);
                });
        dotValues.selectAll('text')
            .data(function(d, i) {
                var dotData = _.pluck(config['data'], d);
                return dotData;
            })
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d);
            })
            .attr('y', function(d,i) {
                return i * (barHeight + barGap) + (barHeight / 2) + 3;
            })
            .attr('dx', function(d,i) {
                var pClass = d3.select(this.parentNode).attr('class');
                var thisDataColumn = (pClass == 'white') ? 'White' : 'Nonwhite';
                var otherDataColumn = (pClass == 'white') ? 'Nonwhite' : 'White';

                if (config['data'][i][thisDataColumn] < config['data'][i][otherDataColumn]) {
                    d3.select(this).classed('left', true);
                    return -8;
                } else {
                    d3.select(this).classed('right', true);
                    return 8;
                }
            })
            .text(function(d) {
                return d.toFixed(0) + '%';
            });
    });

    /*
     * top dot labels
     */
    categories.forEach(function(d,i) {
        var lblElement = chartElement.select('g.value .' + classify(d));
        lblElement.append('text')
            .text(d)
            .attr('class', 'hdr')
            .attr('x', xScale(config['data'][0][d]))
            .attr('dx', function(d,i) {
                if (d == minColumn) {
                    d3.select(this).classed('left', true);
                    return -8;
                } else {
                    d3.select(this).classed('right', true);
                    return 8;
                }
            })
            .attr('y', function(d,i) {
                return -10;
            })
            .call(wrapText, 80, 14);
    })

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
                    return d['label_display'];
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
