// Global config
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;
var categories = null;
var colorScale = null;
var legendLabels = null;

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
 * Format data for D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['value'] = +d['value'];
    });

    // Extract categories from data
    categories = [];

    if (LABELS['legend_labels'] && LABELS['legend_labels'] !== '') {
        // If custom legend labels are specified
        legendLabels = LABELS['legend_labels'].split(',');
        _.each(legendLabels, function(label) {
            categories.push(label.trim());
        });
    } else {
        // Default: Return sorted array of categories
         _.each(DATA, function(state) {
            if (state['category'] != null) {
                categories.push(state['category']);
            }
        });
        categories = d3.set(categories).values().sort();
    }

    if (LABELS['is_numeric'] && LABELS['is_numeric'].toLowerCase() == 'true') {
        colorScale = d3.scale.ordinal()
            .domain(categories)
            .range([ '#ddd', '#b7dbf0','#78aed1','#4982a6','#255675','#0b2f45' ]);
    } else {
        colorScale = d3.scale.ordinal()
            .domain(categories)
            .range([ COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);
    }
}


/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = containerWidth;
    var gutterWidth = 33;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    if (LABELS['is_numeric'] && LABELS['is_numeric'].toLowerCase() == 'true') {
        var isNumeric = true;
    } else {
        var isNumeric = false;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#state-grid-map');
    containerElement.html('');

    // Render the map!
    var mapElement = containerElement.append('div')
        .attr('class', 'chart grid-map');
    renderStateGridMap({
        container: '.chart.grid-map',
        width: graphicWidth,
        data: DATA,
        // isNumeric will style the legend as a numeric scale
        isNumeric: isNumeric
    });

    // Render the bar chart
    var barElement = containerElement.append('div')
        .attr('class', 'chart bar-chart');
    renderBarChart({
        container: '.chart.bar-chart',
        width: graphicWidth,
        data: DATA
    });

    if (!isMobile) {
        containerElement.selectAll('.chart')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (i > 0) {
                    s += 'margin-left: ' + ((gutterWidth / 2) - 1) + 'px; ';
                    s += 'border-left: 1px solid #eee; ';
                    s += 'padding-left: ' + (gutterWidth / 2) + 'px; ';
                }
                return s;
            });
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
    var valueColumn = 'category';

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Create legend
    var legendWrapper = containerElement.select('.key-wrap');
    var legendElement = containerElement.select('.key');

    if (config['isNumeric']) {
        legendWrapper.classed('numeric-scale', true);
    }

    _.each(colorScale.domain(), function(key, i) {
        var keyLabel = key;
        if (config['isNumeric']) {
            var val = +key;
            if (val >= 1000) {
                keyLabel = (val/1000).toFixed(0) + 'k';
            }
        }

        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(keyLabel);

        // Add the optional upper bound label on numeric scale
        if (config['isNumeric'] && i == categories.length - 1) {
            if (LABELS['max_label'] && LABELS['max_label'] !== '') {
                keyItem.append('label')
                    .attr('class', 'end-label')
                    .text(LABELS['max_label']);
            }
        }
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // resize map (needs to be explicitly set for IE11)
    chartElement.attr('width', config['width'])
        .attr('height', function() {
            var s = d3.select(this);
            var viewBox = s.attr('viewBox').split(' ');
            return Math.floor(config['width'] * parseInt(viewBox[3]) / parseInt(viewBox[2]));
        });

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[valueColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);
            var categoryClass = 'category-' + classify(state[valueColumn]);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active ' + categoryClass)
                .attr('fill', colorScale(state[valueColumn]));
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

                // return isMobile ? state['usps'] : state['ap'];
                return state['usps'];
            })
            .attr('class', function(d) {
                return d[valueColumn] !== null ? 'category-' + classify(d[valueColumn]) + ' label label-active' : 'label';
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

                // if (isMobile) {
                    textOffset -= 1;
                // }

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset;
            });

    chartElement.select('path.state-texas').moveToFront()
        .attr('class', 'active');
}


/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'state_name';
    var valueColumn = 'value';

    var chartData = config['data'].sort(function(a, b){
        return d3.descending(a[valueColumn], b[valueColumn]);
    }).filter(function(d,i) {
        return i < 7;
    });

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 60;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 2,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 2000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * chartData.length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');
    containerElement.append('h3')
        .text('Top states')
        .attr('style', 'margin-left: ' + margins['left'] + 'px;');

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
    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    })

    var xScale = d3.scale.linear()
        .domain([ min, max ])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
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
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(chartData)
        .enter()
        .append('rect')
            .attr('x', function(d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
            })
            .attr('fill', function(d) {
                return colorScale(d['category']);
            });

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

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
        .data(chartData)
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

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(chartData)
        .enter()
        .append('text')
            .text(function(d,i) {
                var val = fmtComma(d[valueColumn].toFixed(0));
                if (i == 0) {
                    val += ' MW';
                }
                return val;
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()

                // Negative case
                if (d[valueColumn] < 0) {
                    var outsideOffset = -(valueGap + textWidth);

                    if (xStart + outsideOffset < 0) {
                        d3.select(this).classed('in', true)
                        return valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return outsideOffset;
                    }
                // Positive case
                } else {
                    if (xStart + valueGap + textWidth > chartWidth) {
                        d3.select(this).classed('in', true)
                        return -(valueGap + textWidth);
                    } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    }
                }
            })
            .attr('dy', (barHeight / 2) + 3)
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
