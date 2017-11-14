// Global config
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;
var maps = ['adopted','not-adopted'];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
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

    // define graphic width
    var gutterWidth = 11;
    var graphicWidth = isMobile ?
        containerWidth :
        Math.floor((containerWidth - gutterWidth) / 2);

    // define container element and empty out existing contents
    var containerElement = d3.select('#chart-wrapper');
    containerElement.html('');

    // set up categories, colorscale and legend
    if (LABELS['is_numeric'] && LABELS['is_numeric'].toLowerCase() == 'true') {
        var isNumeric = true;
    } else {
        var isNumeric = false;
    }

    var valueColumn = 'category';
    var categories = getCategories(DATA, valueColumn);

    if (isNumeric) {
        var colorScale = d3.scale.ordinal()
            .domain(categories)
            .range([COLORS['orange2'], COLORS['orange5'], COLORS['teal5'], COLORS['teal2']]);
    } else {
        // Define color scale
        var colorScale = d3.scale.ordinal()
            .domain(categories)
            // .range([COLORS['orange2'], COLORS['orange5'], '#aaa', COLORS['teal5'], COLORS['teal2']]);
            .range([COLORS['orange2'], COLORS['orange5'], COLORS['teal5'], COLORS['teal2']]);
    }

    d3.select('.key-wrap').call(renderLegend, {
        categories: categories,
        colorScale: colorScale,
        isNumeric: isNumeric
    });

    // Make an array of filtering functions to get different slices of our
    // data for each map.  These will be passed to Array.filter()
    var dataFilters = {
        // Took the ACA Medicaid expansion
        'adopted': function(state) {
            return state.expansion === 'Adopted';
        },
        // Didn't take the ACA Medicaid expansion.  These tend to benefit from
        // Graham-Cassidy
        'not-adopted': function(state) {
            return state.expansion === 'Not Adopted';
        }
    };

    var chartHeads = {
        // Hack: we should pass objects that contain slug, chartHead, etc.
        // Took the ACA Medicaid expansion
        'adopted': LABELS['hdr_adopted'],
        // Didn't take the ACA Medicaid expansion.  These tend to benefit from
        // Graham-Cassidy
        'not-adopted': LABELS['hdr_notadopted']
    };

    // Loop through maps array
    maps.forEach(function(slug) {
        var thisChart = 'chart-' + slug;

        // Use our filter function to get the slice of data for a particular map
        var thisChartData = DATA.filter(dataFilters[slug]);
        var thisChartHead = chartHeads[slug];

        // Add a sub-container to hold each of our maps
        var chartElement = containerElement.append('div')
            .attr('id', thisChart)
            .attr('class', 'graphic');

        // Render the map!
        renderStateGridMap({
            container: '#' + thisChart,
            width: graphicWidth,
            data: thisChartData,
            // isNumeric will style the legend as a numeric scale
            isNumeric: isNumeric,
            valueColumn: valueColumn,
            colorScale: colorScale,
            categories: categories,
            chartHead: thisChartHead
        });

        chartElement.append('div')
            .attr('class', 'bar-chart');

        renderBarChart({
            container: '#' + thisChart + ' .bar-chart',
            width: graphicWidth,
            data: thisChartData,
            colorScale: colorScale,
            scale: [ -80, 40 ]
        })
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var getCategories = function(data, valueColumn) {
    // Extract categories from data
    var categories = [];

    if (LABELS['legend_labels'] && LABELS['legend_labels'] !== '') {
        // If custom legend labels are specified
        var legendLabels = LABELS['legend_labels'].split(',');
        _.each(legendLabels, function(label) {
            categories.push(label.trim());
        });
    } else {
        // Default: Return sorted array of categories
         _.each(data, function(state) {
            if (state[valueColumn] != null) {
                categories.push(state[valueColumn]);
            }
        });

        categories = d3.set(categories).values().sort();
    }

    return categories;
}

var fmtValue = function(val, units) {
    var lbl = '';
    if (val < 0) {
        lbl = '-$' + Math.abs(val) + units;
    } else if (val == 0) {
        lbl = '$0';
    } else {
        lbl = '+$' + Math.abs(val) + units;
    }
    return lbl;
}

var renderLegend = function(containerElement, config) {
    var categories = config['categories'];
    var colorScale = config['colorScale'];
    var isNumeric = config['isNumeric'];

    // Create legend
    var legendElement = containerElement.select('.key');

    containerElement.classed('numeric-scale', isNumeric);

    legendElement.selectAll('*').remove();

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .attr('class', 'key-item key-' + i);

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(fmtValue(key, 'B'));

        // Add the optional upper bound label on numeric scale
        if (isNumeric && i == categories.length - 1) {
            if (LABELS['max_label'] && LABELS['max_label'] !== '') {
                keyItem.append('label')
                    .attr('class', 'end-label')
                    .text(fmtValue(+LABELS['max_label'], 'B'));
            }
        }
    });
}

/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
    var colorScale = config['colorScale'];
    var categories = config['categories'];
    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());
    containerElement.select('h3').text(config['chartHead']);

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
        if (state[config['valueColumn']] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);
            var categoryClass = 'category-' + classify(state[config['valueColumn']]);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active ' + categoryClass)
                .attr('fill', colorScale(state[config['valueColumn']]));
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

                return state['usps'];
            })
            .attr('class', function(d) {
                return d[config['valueColumn']] !== null ? 'category-' + classify(d[config['valueColumn']]) + ' label label-active' : 'label';
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

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset - 2;
            });
}

/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    config['data'].forEach(function(d,i) {
        d['raw'] = +d['raw'];
    });

    var labelColumn = 'state_name';
    var valueColumn = 'raw';

    var barHeight = 20;
    var barGap = 3;
    var labelWidth = 0;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 75,
        bottom: 20,
        // left: (labelWidth + labelMargin)
        left: 70
    };

    var ticksX = 6;
    var tickValues = [ -80, -40, 0, 40 ];
    var roundTicksFactor = 5;

    var colorScale = config['colorScale'];

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
    var min = config['scale'][0];
    var max = config['scale'][1];

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
        // .ticks(ticksX)
        .tickFormat(function(d) {
            if (d < 0) {
                return '-' + '$' + Math.abs(d) + 'B';
            } else if (d == 0) {
                return '$' + d;
            } else {
                return '+$' + d.toFixed(0) + 'B';
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

    // chartElement.append('g')
    //     .attr('class', 'x grid')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxisGrid()
    //         .tickSize(-chartHeight, 0, 0)
    //         .tickFormat('')
    //     );

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
            .attr('fill', function(d,i) {
                return colorScale(d['category']);
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
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
    // chartWrapper.append('ul')
    //     .attr('class', 'labels')
    //     .attr('style', formatStyle({
    //         'width': labelWidth + 'px',
    //         'top': margins['top'] + 'px',
    //         'left': '0'
    //     }))
    //     .selectAll('li')
    //     .data(config['data'])
    //     .enter()
    //     .append('li')
    //         .attr('style', function(d, i) {
    //             return formatStyle({
    //                 'width': labelWidth + 'px',
    //                 'height': barHeight + 'px',
    //                 'left': '0px',
    //                 'top': (i * (barHeight + barGap)) + 'px;'
    //             });
    //         })
    //         .attr('class', function(d) {
    //             return classify(d[labelColumn]);
    //         })
    //         .append('span')
    //             .text(function(d) {
                    // var ap = '';
                    // _.each(STATES, function(v,k) {
                    //     if (v['name'] == d[labelColumn]) {
                    //         ap = v['ap'];
                    //     }
                    // });
                    // return ap;
    //             });

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d) {
                // var lbl = d[labelColumn];
                var lblState = '';
                _.each(STATES, function(v,k) {
                    if (v['name'] == d[labelColumn]) {
                        lblState = v['ap'];
                    }
                });

                var lblValue = fmtValue(d[valueColumn], 'B');
                if (d['raw_override'] != null) {
                    lblValue = d['raw_override'];
                }

                return lblState + ': ' + lblValue;
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength();

                // Negative case
                if (d[valueColumn] < 0) {
                    var outsideOffset = -(valueGap + textWidth);

                    // if (xStart + outsideOffset < 0) {
                    //     d3.select(this).classed('in', true)
                    //     return valueGap;
                    // } else {
                        d3.select(this).classed('out', true)
                        return outsideOffset;
                    // }
                // Positive case
                } else {
                    // if (xStart + valueGap + textWidth > chartWidth) {
                    //     d3.select(this).classed('in', true)
                    //     return -(valueGap + textWidth);
                    // } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    // }
                }
            })
            .attr('dy', (barHeight / 2) + 3);
};


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
