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
        var values = [];
        d['duration'] = +d['duration'];

        for (key in d) {
            if (_.contains([ 'label', 'duration' ], key)) {
                continue;
            }

            if (d[key]) {
                d[key] = +d[key];

                values.push({ 'label': key, 'amt': d[key] });
            }
        }

        d['values'] = values;
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

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 70;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;
    var blockHeight = (barHeight - 2) / 2;
    var blockWidth = blockHeight * .4;

    var margins = {
        top: 0,
        right: 0,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var tickValues = [ 0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77 ];

    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 6;
        tickValues = [ 0, 14, 28, 42, 56, 70 ];
        blockWidth = blockWidth / 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(config['data'][0]['values'])
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d[labelColumn]);
			});

    legend.append('b');
    legend.append('label')
        .text(function(d) {
            return d[labelColumn];
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
     * Create D3 scale objects.
     */
    var min = 0;
    var max = 80;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(tickValues)
        .tickFormat(function(d, i) {
            if (i == 0) {
                return 'Day ' + d;
            } else {
                return d;
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
     * Render range bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', function(d, i) {
                return xScale(min);
            })
            .attr('x2', function(d, i) {
                return xScale(d['duration']);
            })
            .attr('y1', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('y2', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('style', 'stroke-width: ' + barHeight + 'px;');

    /*
     * Render dots to chart.
     */
    var group = chartElement.selectAll('.group')
        .data(config['data'])
        .enter().append('g')
            .attr('class', function(d) {
                return 'group ' + classify(d[labelColumn]);
            })
            .attr('transform', function(d, i) {
                return makeTranslate(0, (i * (barHeight + barGap)))
            });

    group.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]) - (blockWidth / 2);
            })
            .attr('y', 0)
            .attr('width', blockWidth)
            .attr('height', barHeight);

    var shiftUp = [ '.reagan .chief-of-staff', '.clinton .first-cabinet-secretary', '.clinton .senior-adviser', '.gw-bush .senior-adviser', '.trump .chief-of-staff', '.trump .national-security-adviser' ];
    var shiftDown = [ '.reagan .senior-adviser', '.clinton .omb-director', '.clinton .press-secretary', '.gw-bush .national-security-adviser', '.trump .senior-adviser', '.trump .first-cabinet-secretary' ];
    _.each(shiftUp, function(d) {
        chartElement.select(d)
            .attr('y', ((barHeight / 2) - .5 - blockHeight))
            .attr('height', blockHeight);
    });
    _.each(shiftDown, function(d) {
        chartElement.select(d)
            .attr('y', ((barHeight / 2) + .5))
            .attr('height', blockHeight);
    });


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
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
