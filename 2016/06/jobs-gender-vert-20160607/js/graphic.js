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
        d['women'] = +d['women'];
    });
}

/*
 * Render the graphic.
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
    renderGraphic({
        container: '#graphic',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a graphic.
 */
var renderGraphic = function(config) {
    // Calculate actual chart dimensions
    var chartWidth = 30;
    var chartHeight = 550;

    var marginLeft = 175;
    if (isMobile) {
        marginLeft = 80;
    }
    var marginRight = config['width'] - chartWidth - marginLeft;
    // var marginSides = (config['width'] - chartWidth) / 2;

    var margins = {
        top: 15,
        right: marginRight,
        bottom: 10,
        left: marginLeft
    };

    var dotRadius = 6;
    var labelOffset = 10;
    var ticksY = 10;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Create container
    var chartElement = containerElement.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    // Draw here!
    var yScale = d3.scale.linear()
        .domain([ 0, 100 ])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return '';
            // return d + '%';
        });

    // draw background bar
    chartElement.append('rect')
        .attr('class', 'bg')
        .attr('x', 0)
        .attr('width', chartWidth)
        .attr('y', 0)
        .attr('height', chartHeight);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

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
     * Draw dots!
     */
    var dots = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter()
            .append('circle')
            .attr('cx', (chartWidth / 2))
            .attr('cy', function(d) {
                return yScale(d['women']);
            })
            .attr('r', dotRadius)
            .attr('class', function(d) {
                var c = classify(d['label']);
                if (d['govt'] != null) {
                    c += ' ' + classify(d['govt']);
                }
                return c;
            });

    chartElement.select('circle.yes').moveToFront();

    /*
     * Draw label lines
     */
    var connectors = chartElement.append('g')
        .attr('class', 'connectors')
        .selectAll('line')
        .data(config['data'])
        .enter()
            .append('line')
            .attr('class', function(d) {
                var c = classify(d['label']);
                if (d['govt'] != null) {
                    c += ' ' + classify(d['govt']);
                }
                return c;
            })
            .attr('x1', function(d) {
                if (d['govt'] == 'yes') {
                    return ((chartWidth / 2) - (dotRadius));
                } else {
                    return chartWidth - ((chartWidth / 2) - (dotRadius));
                }
            })
            .attr('x2', function(d) {
                if (d['govt'] == 'yes') {
                    return -4;
                } else {
                    return chartWidth + 4;
                }
            })
            .attr('y1', function(d) {
                return yScale(d['women']);
            })
            .attr('y2', function(d) {
                return yScale(d['women']);
            });

    /*
     * Draw labels!
     */
    var values = chartElement.append('g')
        .attr('class', 'values')
        .selectAll('text')
        .data(config['data'])
        .enter()
            .append('text')
            .text(function(d) {
                if (!isMobile) {
                    return d['label'] + ': ' + d['women'] + '%';
                } else {
                    return d['label2'] + ': ' + d['women'] + '%';
                }
            })
            .attr('class', function(d) {
                var c = classify(d['label']);
                if (d['govt'] != null) {
                    c += ' ' + classify(d['govt']);
                }
                return c;
            })
            .attr('x', function(d) {
                if (d['govt'] == 'yes') {
                    return 0;
                } else {
                    return chartWidth;
                }
            })
            .attr('y', function(d) {
                return yScale(d['women']) + 4;
            })
            .attr('dx', function(d) {
                if (d['govt'] == 'yes') {
                    return -labelOffset;
                } else {
                    return labelOffset;
                }
            });

    values.each(function() {
        var t = d3.select(this);

        // wrap labels: right side
        if (t.classed('no')) {
            t.call(wrapText, (margins['right'] - labelOffset), 14);
        // wrap labels: left side
        } else if (t.classed('yes')) {
            t.call(wrapText, (margins['left'] - labelOffset), 14);
        }

        // check if the label goes past the bottom of the graphic;
        // make graphic taller if so
        var tBBox = t.node().getBBox();
        var tHeight = tBBox['y'] + tBBox['height'] + margins['top'];
        var svgHeight = chartHeight + margins['top'] + margins['bottom'];
        if (tHeight > svgHeight) {
            containerElement.select('svg')
                .attr('height', tHeight);
            margins['bottom'] = tHeight - margins['top'] - chartHeight;
        }
    });

    chartElement.append('text')
        .text('Government')
        .attr('class', 'header yes')
        .attr('x', 0)
        .attr('y', -margins['top'])
        .attr('dx', -labelOffset)
        .attr('dy', 10);

    chartElement.append('text')
        .text('Other Jobs')
        .attr('class', 'header')
        .attr('x', chartWidth)
        .attr('y', -margins['top'])
        .attr('dx', labelOffset)
        .attr('dy', 10);
}

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
