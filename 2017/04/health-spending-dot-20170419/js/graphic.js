// Global vars
var pymChild = null;
var isMobile = false;

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
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    GRAPHIC_DATA.forEach(function(d) {
        d['health_capita_2014'] = +d['health_capita_2014'];
        d['life_expectancy'] = +d['life_expectancy'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderLineChart({
        container: '#graphic',
        width: containerWidth,
        data: GRAPHIC_DATA
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
    var xColumn = 'health_capita_2014';
    var yColumn = 'life_expectancy';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 25,
        bottom: 45,
        left: 50
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;
    var dotRadius = 3.5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 30;
        dotRadius = 3;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(KEY)
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d['value']);
			});

    legend.append('b');

    legend.append('label')
        .text(function(d) {
            return d['label'];
        });

    /*
     * Create D3 scale objects.
     */

    var xScale = d3.scale.linear()
        .domain([ 0, 10000 ])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ 40, 90 ])
        .range([ chartHeight, 0 ]);

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

    var tooltip = chartWrapper.append('div')
        .attr('id', 'tooltip');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return '$' + fmtComma(d);
        })

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d;
        })

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    chartElement.append('text')
        .attr('class', 'x axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 40)
        .text(LABELS.hed_x);

    chartElement.append('text')
        .attr('class', 'y axis-label')
        .attr('text-anchor', 'middle')
        .attr('y', -margins['left'])
        .attr('dy', '1em')
        .attr('x', -(chartHeight / 2))
        .attr('transform', 'rotate(-90)')
        .text(LABELS.hed_y);

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
     * Render dots to chart.
     */
    var dots = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('r', dotRadius)
            .attr('cx', function(d) {
                return xScale(d[xColumn]);
            })
            .attr('cy', function(d) {
                return yScale(d[yColumn]);
            })
            .attr('class', function(d) {
                var c = classify(d['location_name']);
                if (d['category']) {
                    c += ' ' + classify(d['category']);
                }
                if (d['highlight']) {
                    c += ' circle highlight';
                }
                return c;
            });
    chartElement.selectAll('.dots .highlight').moveToFront();

    if (!isMobile) {
        dots.on('mouseover', function(d) {
            var ttText = '';
            ttText += '<strong>' + d['location_name'] + '</strong><br />';
            ttText += LABELS.hed_y + ': ' + d[yColumn] + '<br />';
            ttText += LABELS.hed_x + ': $' + fmtComma(d[xColumn]);

            d3.select(this).classed('active', true);
            tooltip.classed('active', true)
                .html(ttText)
                .attr('style', function() {
                    var dotX = xScale(d[xColumn]);
                    var dotY = yScale(d[yColumn]);

                    var s = '';
                    var ttWidth = tooltip.node().getBoundingClientRect()['width'];
                    var ttHeight = tooltip.node().getBoundingClientRect()['height'];
                    s += 'top: ' + calculateYPos(dotY, ttHeight, (chartHeight + margins['top'] + margins['bottom'])) + 'px; ';
                    s += 'left: ' + calculateXPos(dotX, ttWidth, (chartWidth + margins['left'] + margins['right'])) + 'px; ';
                    return s;
                });
        })
        .on('mouseout', function(d) {
            d3.select(this).classed('active', false);
            // only trigger if we've not moused over any other circles
            var e = d3.event;
            if (!d3.select(e.toElement).classed('circle')) {
                tooltip.classed('active', false);
            }
        });
    }

    /*
     * Render labels.
     */
    chartElement.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(config['data'].filter(function(d, i) {
            return d['highlight'] !== null;
        }))
        .enter().append('text')
            .attr('x', function(d) {
                return xScale(d[xColumn]);
            })
            .attr('y', function(d) {
                return yScale(d[yColumn]);
            })
            .attr('dy', function(d) {
                switch(d['label_placement']) {
                    case 'left':
                        return '0.4em';
                        break;
                    case 'right':
                        return '0.4em';
                        break;
                    case 'bottom':
                        return '1.3em';
                        break;
                    default:
                        return '-0.7em';
                        break;
                }
            })
            .attr('dx', function(d) {
                switch(d['label_placement']) {
                    case 'left':
                        return '-0.6em';
                        break;
                    case 'right':
                        return '0.6em';
                        break;
                    default:
                        return 0;
                        break;
                }
            })
            .attr('pointer-events', 'none')
            .attr('class', function(d) {
                var c = classify(d['location_name']);
                if (d['label_placement']) {
                    c += ' ' + classify(d['label_placement']);
                }
                return c;
            })
            .text(function(d) {
                return d['location_name'];
            });
}

// calculate optimal x/y tooltip position
var calculateXPos = function(xPos, width, graphicWidth) {
    var newXPos = null;
    var offset = 5;
    var ttWidth = xPos + offset + width;
    if (ttWidth > graphicWidth) {
        // newXPos = xPos - width - offset;
        newXPos = graphicWidth - width - offset;
    } else {
        newXPos = xPos + offset;
    }
    return newXPos;
}
var calculateYPos = function(yPos, height, graphicHeight) {
    var newYPos = null;
    var offset = 15;
    var ttHeight = yPos + offset + height;
    if (ttHeight > graphicHeight) {
        newYPos = yPos - height - offset;
    } else {
        newYPos = yPos + offset;
    }
    return newYPos;
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
