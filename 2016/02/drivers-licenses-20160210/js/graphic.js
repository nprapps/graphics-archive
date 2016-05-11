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
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['key'] = d['Group'];
        d['values'] = [];

        _.each(d, function(v, k) {
            if (_.contains(['Group', 'key', 'values'], k)) {
                return;
            }

            d['values'].push({ 'label': k, 'amt': +v });
            delete d[k];
        });

        delete d['Group'];
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
    renderGroupedBarChart({
        container: '#grouped-bar-chart',
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
var renderGroupedBarChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var numGroups = config['data'].length;
    var numGroupBars = config['data'][0]['values'].length;

    var barHeight = 24;
    var wideBarHeight = 24;
    var thinBarHeight = 10;
    var barGapInner = 0;
    var barGap = 14;
    var groupHeight = wideBarHeight;
    var labelWidth = 78;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 55,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 7;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    //var chartHeight = (((((barHeight + barGapInner) * numGroupBars) - barGapInner) + barGap) * numGroups) - barGap + barGapInner;
    var chartHeight = (groupHeight + barGap) * numGroups;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    var yScale = d3.scale.linear()
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
    .domain(_.pluck(config['data'][0]['values'], labelColumn))
        .range([COLORS['teal5'], COLORS['teal2']]);
    /*
     * Render a color legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(config['data'][0]['values'])
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d[labelColumn]);
            });

    legend.append('b')
        .style('background-color', function(d) {
        	return colorScale(d[labelColumn]);
        });

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
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d.toFixed(0) + '%';
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
    var barGroups = chartElement.selectAll('.bars')
        .data(config['data'])
        .enter()
        .append('g')
            .attr('class', function(d) {
                var add_class = 'group-' + classify(d['key']);
                return 'g bars '+ add_class;
            })
            .attr('transform', function(d, i) {
                if (i == 0) {
                    return makeTranslate(0, 0);
                }

                return makeTranslate(0, (groupHeight + barGap) * i);
            });

    barGroups.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter()
        .append('rect')
            .attr('x', function(d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                if (i == 0) {
                    return 0;
                } else {
                    return (wideBarHeight - thinBarHeight) / 2;
                }

                //return (barHeight * i) + (barGapInner * i);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('height', function(d,i) {
                if (i == 0) {
                    return wideBarHeight;
                } else {
                    return thinBarHeight;
                }
            })
            //.style('fill', function(d) {
                //return colorScale(d[labelColumn]);
            //})
            .attr('class', function(d) {
                return 'y-' + d[labelColumn];
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
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d,i) {
                var top = (groupHeight + barGap) * i;

                if (i == 0) {
                    top = 0;
                }

                return formatStyle({
                    'width': (labelWidth - 10) + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': top + 'px;'
                });
            })
            .attr('class', function(d,i) {
                return classify(d['key']);
            })
            .append('span')
                .text(function(d) {
                    return d['key']
                });

    /*
     * Render bar values.
     */
    barGroups
        .append('g')
            .attr('class', 'value')
            .append('text')
            .text(function(d,i) {
                var change = d['values'][1][valueColumn] - d['values'][0][valueColumn];
                var change_type = change > 0 ? 'Up ' : 'Down ';
                var change_v = Math.abs(change).toFixed(1);
                var suffix = i == 0 ? ' percentage points since 1983' : '';

                return change_type + change_v + suffix;
            })
            .attr('x', function(d) {
                var change = d['values'][1][valueColumn] - d['values'][0][valueColumn];
                var x_val = change > 0 ? 1 : 0;
                return xScale(d['values'][x_val][valueColumn]);
            })
            .attr('y', function(d, i) {
                return 0;
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
            .attr('dy', (barHeight / 2) + 4);

    if (isMobile) {
        chartWrapper.select('.group-16-years-old').select('text')
            .call(wrapText, 120, 12)
    }
}

/*
 * Wrap a block of text to a given width
 * via http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = parseFloat(text.attr('dx'));
        var dy = parseFloat(text.attr('dy'));

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', dy + (lineNumber * lineHeight))
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
