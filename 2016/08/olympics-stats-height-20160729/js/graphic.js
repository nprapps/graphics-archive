// Global vars
var pymChild = null;
var isMobile = false;
var HEIGHT_BINS = [ 56, 60, 64, 68, 72, 76, 80, 84 ];
var HEIGHT_BINS_CONVERTED = [ '4\' 8\"', '5\' 0\"', '5\' 4\"', '5\' 8\"', '6\' 0\"', '6\' 4\"', '6\' 8\"', '7\' 0\"' ]
var heightData = [];

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
    heightData['men'] = [];
    heightData['women'] = [];
    var numBins = HEIGHT_BINS.length - 1;

    // init the bins
    for (var i = 0; i < numBins; i++) {
        heightData['men'][i] = 0;
        heightData['women'][i] = 0;
    }
    DATA['height'].forEach(function(d, i) {
        var gender = d['gender'];
        d['inches'] = +d['inches'];
        d['amt'] = +d['amt'];

        HEIGHT_BINS.forEach(function(v, k) {
            if (d['inches'] >= HEIGHT_BINS[k] && d['inches'] < HEIGHT_BINS[k + 1]) {
                heightData[gender][k] += d['amt'];
            }
        })
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

    var heightContainer = containerElement.append('div')
        .attr('class', 'chart height');
    var height1 = heightContainer.append('div')
        .attr('class', 'height1 male')
        .attr('style', function() {
            var s = '';
            if (!isMobile) {
                s += 'float: left; '
                s += ' width: ' + smallGraphicWidth + 'px; ';
            }
            return s;
        });
    height1.append('h3')
        .html(HEADERS['height1']['header']);
    var height2 = heightContainer.append('div')
        .attr('class', 'height2 female')
        .attr('style', function() {
            var s = '';
            if (!isMobile) {
                s += 'float: right; '
                s += ' width: ' + smallGraphicWidth + 'px; ';
            }
            return s;
        });
    height2.append('h3')
        .html(HEADERS['height2']['header']);

    renderColumnChart({
        container: '.height1',
        width: smallGraphicWidth,
        data: heightData['men'],
        chart: 'men'
    });
    renderColumnChart({
        container: '.height2',
        width: smallGraphicWidth,
        data: heightData['women'],
        chart: 'women'
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render column charts for male/female heights.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 2 : 3;
    var aspectHeight = isMobile ? 1 : 1.2;
    var valueGap = 6;

    var margins = {
        top: 20,
        right: 5,
        bottom: 20,
        left: 30
    };

    var ticksY = 2;
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

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
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], .1)
        .domain(HEIGHT_BINS.slice(0, -1));

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([ min, max ])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .outerTickSize(0)
        .tickFormat(function(d, i) {
            return HEIGHT_BINS_CONVERTED[i];
            // return d + '"';
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

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
     * Shift tick marks
     */
    chartElement.selectAll('.x.axis .tick')
        .attr('transform', function() {
            var el = d3.select(this);
            var transform = d3.transform(el.attr('transform'));

            transform.translate[0] = transform.translate[0] - (xScale.rangeBand() / 2) - ((xScale.rangeBand() * .1) / 2);
            transform.translate[1] = 0;

            return transform.toString();
        })

    var lastTick = chartElement.select('.x.axis')
        .append('g')
        .attr('class', 'tick')
        .attr('transform', function() {
            var transform = d3.transform();
            var lastBin = xScale.domain()[xScale.domain().length - 1];

            transform.translate[0] = xScale(lastBin) + xScale.rangeBand() + ((xScale.rangeBand() * .1) / 2);
            transform.translate[1] = 0;

            return transform.toString();
        })

    lastTick.append('line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', 6)

    lastTick.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', 0)
        .attr('y', 9)
        .attr('dy', '0.71em')
        .text(HEIGHT_BINS_CONVERTED[HEIGHT_BINS.length - 1] + '"');

    /*
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d,i) {
                return xScale(HEIGHT_BINS[i]);
            })
            .attr('y', function(d) {
                if (d < 0) {
                    return yScale(0);
                }

                return yScale(d);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                if (d < 0) {
                    return yScale(d) - yScale(0);
                }

                return yScale(0) - yScale(d);
            })
            .attr('class', 'bar');

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
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');
    var annotationLabel = null;
    var annotationXPos = null;

    switch(config['chart']) {
        case 'men':
            annotationLabel = 'U.S. average: 5 foot 9.3 inches';
            annotationXPos = xScale(xScale.domain()[3]) + (xScale.rangeBand() * (1.3 / 4));
            break;
        case 'women':
            annotationLabel = 'U.S. average: 5 foot 3.8 inches';
            annotationXPos = xScale(xScale.domain()[1]) + (xScale.rangeBand() * (3.8 / 4));
            break;
    }

    annotations.append('line')
        .attr('x1', annotationXPos)
        .attr('x2', annotationXPos)
        .attr('y1', -3)
        .attr('y2', chartHeight);
    annotations.append('text')
        .html(annotationLabel)
        .attr('x', annotationXPos)
        .attr('y', -10);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
