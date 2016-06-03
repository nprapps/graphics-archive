// Global config
var MAP_TEMPLATE_ID = '#map-template';
var COLORS = [ '#c5dfdf','#81b2b1','#488382','#1a5554','#002b2a' ];

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
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    HISTOGRAM.forEach(function(d) {
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

    var graphicWidth = containerWidth;
    gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the map!
    var containerElement = d3.select('#state-grid-map');

    var students = containerElement.select('.grid-map.students .wrapper');
    students.html('');

    renderStateGridMap({
        container: '.grid-map.students .wrapper',
        width: graphicWidth,
        data: DATA
    });

    var histogram = containerElement.select('.histogram .wrapper');
    histogram.html('');

    // Render the map!
    renderColumnChart({
        container: '.histogram .wrapper',
        width: graphicWidth,
        data: HISTOGRAM
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    var categories = [];

    _.each(config['data'], function(state) {
        if (state['category'] != null) {
            // state['category'] = +state['category'];
            categories.push(state['category']);
        }
    });

    categories.sort();

    // categories = d3.set(categories).values().sort(function(a, b){
    //     return d3.ascending(+a, +b);
    // });

    // Define color scale
    var colorScale = d3.scale.ordinal()
        .domain(categories)
        .range(COLORS);

    // Create legend
    // var legendElement = containerElement.select('.key');
    //
    // _.each(colorScale.domain(), function(key, i) {
    //     var keyItem = legendElement.append('li')
    //         .classed('key-item', true)
    //
    //     keyItem.append('b')
    //         .style('background', colorScale(key));
    //
    //     keyItem.append('label')
    //         .text(key);
    // });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state['category'] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(state['category']));
        }
    });

    // Draw state labels
    chartElement.append('g')
        .selectAll('text')
            .data(config['data'])
        .enter().append('text')
            .attr('text-anchor', 'middle')
            .text(function(d) {
                var state = _.findWhere(STATES, { 'name': d['state_name'] });

                return isMobile ? state['usps'] : state['ap'];
            })
            .attr('class', function(d) {
                return d['category'] !== null ? 'label label-active' : 'label';
            })
            .attr('x', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = chartElement.select(className)[0][0].getBBox();

                return tileBox['x'] + tileBox['width'] * 0.52;
            })
            .attr('y', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = chartElement.select(className)[0][0].getBBox();
                var textBox = d3.select(this)[0][0].getBBox();
                var textOffset = textBox['height'] / 2;

                if (isMobile) {
                    textOffset -= 1;
                }

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset;
            });

    // Create legend
    var legendOrder = colorScale.domain();
    var legendTop = 0;
    var legendBoxWidth = 20;
    var legendBoxHeight = 8;
    if (isMobile) {
        legendBoxWidth = 30;
        legendBoxHeight = 10;
    }
    var legendWidth = (legendOrder.length) * (legendBoxWidth + 1) - 1;
    var legendElement = chartElement.append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + ((436 - legendWidth) / 2) + ',' + legendTop + ')');

    legendElement.selectAll('rect')
        .data(legendOrder)
        .enter().append('rect')
            .attr('x', function(d, i) {
                return i * (legendBoxWidth + 1);
            })
            .attr('y', 0)
            .attr('width', legendBoxWidth)
            .attr('height', legendBoxHeight)
            .attr('fill', function(d) {
                return colorScale(d);
            });

    legendElement.selectAll('text')
        .data(legendOrder)
        .enter().append('text')
            .attr('x', function(d, i) {
                return (i * (legendBoxWidth + 1));
            })
            .attr('y', function() {
                if (isMobile) {
                    return legendBoxHeight + 18;
                } else {
                    return legendBoxHeight + 10;
                }
            })
            .attr('text-anchor', 'middle')
            .text(function(d) {
                return d;
            });

    legendElement.append('text')
        .attr('x', (5 * (legendBoxWidth + 1)))
        .attr('y', function() {
            if (isMobile) {
                return legendBoxHeight + 18;
            } else {
                return legendBoxHeight + 10;
            }
        })
        .attr('text-anchor', 'middle')
        .text('100%');
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

    var margins = {
        top: 5,
        right: 10,
        bottom: 20,
        left: 20
    };

    var ticksY = 2;
    var roundTicksFactor = 10;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = 40;

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
        .outerTickSize(0)
        .tickFormat(function(d, i) {
            if (i % 4 == 0) {
                return d + '%';
            }
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
     * Shift tick marks
     */
    chartElement.selectAll('.x.axis .tick')
        .attr('transform', function() {
            var el = d3.select(this);
            var transform = d3.transform(el.attr('transform'));

            transform.translate[0] = transform.translate[0] - (xScale.rangeBand() / 2) - ((xScale.rangeBand() * .1) / 2);
            transform.translate[1] = 3;

            return transform.toString();
        })

    var lastTick = chartElement.select('.x.axis')
        .append('g')
        .attr('class', 'tick')
        .attr('transform', function() {
            var transform = d3.transform();
            var lastBin = xScale.domain()[xScale.domain().length - 1];

            transform.translate[0] = xScale(lastBin) + xScale.rangeBand() + ((xScale.rangeBand() * .1) / 2);
            transform.translate[1] = 3;

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
        .text(function() {
            return '100%';
        });

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
                return 'bar bar-' + d[labelColumn];
            })
            .attr('fill', function(d) {
                if (d['label'] == "0" || d['label'] == "5" || d['label'] == "10" || d['label'] == "15") {
                    return COLORS[0];
                }
                if (d['label'] == "20" || d['label'] == "25" || d['label'] == "30" || d['label'] == "35") {
                    return COLORS[1];
                }
                if (d['label'] == "40" || d['label'] == "45" || d['label'] == "50" || d['label'] == "55") {
                    return COLORS[2];
                }
                if (d['label'] == "60" || d['label'] == "65" || d['label'] == "70" || d['label'] == "75") {
                    return COLORS[3];
                }
                if (d['label'] == "80" || d['label'] == "85" || d['label'] == "90" || d['label'] == "95") {
                    return COLORS[4];
                }
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
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
