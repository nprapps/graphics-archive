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
    DATA['age'].forEach(function(d) {
        d['years'] = +d['years'];
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

    var smallGraphicWidth = null;
    var miniGraphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        // smallGraphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
        smallGraphicWidth = containerWidth;
        miniGraphicWidth = Math.floor((containerWidth - (gutterWidth * 2)) / 3);
    } else {
        isMobile = false;
        smallGraphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
        miniGraphicWidth = Math.floor((containerWidth - (gutterWidth * 2)) / 3);
    }

    // Render the chart!
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    var ageContainer = containerElement.append('div')
        .attr('class', 'chart age');
    ageContainer.append('h3')
        .html(HEADERS['age']['header']);
    ageContainer.append('p')
        .attr('class', 'description')
        .html(HEADERS['age']['description']);
    renderAgeChart({
        container: '.chart.age',
        width: containerWidth,
        data: DATA['age']
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render age chart.
 */
var renderAgeChart = function(config) {
    /*
     * Setup
     */
    var sports = _.pluck(config['data'], 'sport');
    sports = d3.set(sports).values();

    var barHeight = 40;
    var barGap = 5;
    var labelWidth = 100;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;

    var margins = {
        top: 0,
        right: 10,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 8;
    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 6;
        margins['right'] = 1;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * sports.length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

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
    var min = 15;
    var max = 55;

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
            return d;
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
     * Render dots to chart.
     */
    sports.forEach(function(s, a) {
        var dotContainer = chartElement.append('g')
            .attr('class', 'dots ' + classify(s))
            .attr('transform', makeTranslate(0, (a * (barHeight + barGap))));

        var dotData = config['data'].filter(function(v, k) {
            return v['sport'] == s;
        });

        var dotExtent = d3.extent(dotData, function(d) {
            return d['years'];
        });

        dotContainer.append('line')
            .attr('class', 'extent')
            .attr('x1', xScale(dotExtent[0]))
            .attr('x2', xScale(dotExtent[1]))
            .attr('y1', barHeight / 2)
            .attr('y2', barHeight / 2);

        var barWidth = chartWidth / (xScale.domain()[1] - xScale.domain()[0] + 1);
        var maxValue = 18;

        dotContainer.selectAll('rect')
            .data(dotData)
            .enter()
                .append('rect')
                    .attr('x', function(d) {
                        return xScale(d['years']) - (barWidth / 2);
                    })
                    .attr('width', barWidth)
                    .attr('y', function(d) {
                        if (d['amt'] > 0) {
                            return (barHeight - Math.ceil((d['amt'] / maxValue) * barHeight)) / 2;
                        } else {
                            return barHeight / 2;
                        }
                    })
                    .attr('height', function(d) {
                        if (d['amt'] > 0) {
                            return Math.ceil((d['amt'] / maxValue) * barHeight);
                        } else {
                            return 0;
                        }
                    });

        // var radius = d3.scale.sqrt()
        //     .domain([ 0, 20 ])
        //     .range([ 0, (barHeight / 1.7) ]);
        //
        // dotContainer.selectAll('circle')
        //     .data(dotData)
        //     .enter()
        //         .append('circle')
        //         .attr('cx', function(d, i) {
        //             return xScale(d['years']);
        //         })
        //         .attr('cy', barHeight / 2)
        //         .attr('r', function(d) {
        //             return radius(d['amt']);
        //         });


    });

    /*
     * Render bar labels.
     */
    chartWrapper
        .append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(sports)
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
                return classify(d);
            })
            .append('span')
                .text(function(d) {
                    return d;
                });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
