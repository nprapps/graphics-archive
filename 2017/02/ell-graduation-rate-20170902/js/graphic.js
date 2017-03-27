// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'state', 'key', 'values', 'state_ap', 'key_short' ];
var legendLabelText = ['ELL Grads', 'Total Grads'];
var legendLabelTextAbbr = ['ELLs', 'Total'];
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
        d['key'] = d['state'];
        d['key_short'] = d['state_ap'];
        d['values'] = [];

        _.each(d, function(v, k) {
            if (_.contains(skipLabels, k)) {
                return;
            }

            d['values'].push({ 'label': k, 'amt': +v });
            delete d[k];
        });

        delete d['state'];
        delete d['state_ap'];
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
    var thinBarHeight = 9;
    var barGapInner = 0;
    var barGap = 14;
    var groupHeight =  wideBarHeight;
    var labelWidth = 115;
    var labelMargin = 3;
    var valueGap = 6;
    var legendLabel = 65;
    var legendLabelAbbr = 45;
    var legendSpacer = 15;

    var margins = {
        top: 25,
        right: 160,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    if (isMobile) {
        labelWidth = 45;
        margins['left'] = (labelWidth + labelMargin);
        margins['right'] = 112;
    }

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
        .domain([min, 100])
        .range([0, chartWidth]);

    var yScale = d3.scale.linear()
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]['values']).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([COLORS['blue4'], COLORS['blue1']]);

    /*
     * Render a color legend.
     */
    // var legend = containerElement.append('ul')
    //     .attr('class', 'key')
    //     .selectAll('g')
    //         .data(config['data'][0]['values'])
    //     .enter().append('li')
    //         .attr('class', function(d, i) {
    //             return 'key-item key-' + i + ' ' + classify(d[labelColumn]);
    //         })
    //
    //         .attr("transform", "translate(" + margins['left'] + "," + margins['bottom'] + ")");
    //
    // legend.append('b')
    //     .style('background-color', function(d) {
    //     	return colorScale(d[labelColumn]);
    //     });
    //
    // legend.append('label')
    //     .text(function(d) {
    //         return d[labelColumn];
    //     });

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
     * Render percentage labels.
     */
    var legendHeader = chartElement.selectAll('.textLabels')
        .data(function() {
            if (isMobile) {
                return legendLabelTextAbbr;
            } else {
                return legendLabelText;
            }
        })
        .enter()
        .append('g')
            .attr('class', function(d) {
                return 'g labelText';
            });

    legendHeader.selectAll('rect')
        .data(function() {
            if (isMobile) {
                return legendLabelTextAbbr;
            } else {
                return legendLabelText;
            }
        })
        .enter().append('rect')
            .attr('class', function(d) {
                return 'labelsBackground legend-' + classify(d);
            })
            .attr('x', function(d) {
                if (d == 'ELL Grads') {
                    return chartWidth;
                } else if (d == 'ELLs') {
                    return chartWidth + legendSpacer - 5;
                } else if (d == 'Total') {
                    return chartWidth + legendLabel;
                } else {
                    return chartWidth + legendLabel + legendSpacer;
                }
            })
            .attr('fill', function(d) {
                if (d == 'ELL Grads' || d == 'ELLs') {
                    return COLORS['blue1'];
                } else {
                    return COLORS['blue4'];
                }
            })
            .attr('rx', 3)
            .attr('ry', 3)
            .attr('width', function() {
                if (isMobile) {
                    return legendLabelAbbr;
                } else {
                    return legendLabel + 5;
                }
            })
            .attr('height', 20)
            .attr('y', -24);

    legendHeader.selectAll('text')
        .data(function() {
            if (isMobile) {
                return legendLabelTextAbbr;
            } else {
                return legendLabelText;
            }
        })
        .enter().append('text')
            .attr('x', function(d) {
                if (d == 'ELLs') {
                    return chartWidth + (legendSpacer * 2) + 3;
                } else if (d == 'ELL Grads') {
                    return chartWidth + legendSpacer + 20;
                } else if (d == 'Total') {
                    return chartWidth + legendLabel + (legendSpacer * 1.5);
                } else {
                    return chartWidth + legendLabel + (legendSpacer * 2) + 20;
                }
            })
            .attr('y', -10)
            .text(function(d) {
                return d;
            })
            .attr('class', function(d, i) {
                return 'legend-label legend-' + classify(d);
            });

    /*
     * Render bars to chart.
     */
    var barGroups = chartElement.selectAll('.bars')
        .data(config['data'])
        .enter()
        .append('g')
            .attr('class', function(d){
                return 'g bars';
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
                    return ((wideBarHeight - thinBarHeight) * i)/ 2;
                }
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('height', function(d,i){
                if(i == 0){
                    return wideBarHeight;
                } else{
                    return thinBarHeight;
                }
            })
            .style('fill', function(d) {
            	return colorScale(d[labelColumn]);
            })
            .attr('class', function(d) {
                return 'y-' + classify(d[labelColumn]);
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
            'left': '5px'
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
                    if (isMobile) {
                        return d['key_short'];
                    } else {
                        return d['key'];
                    }
                });

    /*
     * Render bar values.
     */
    barGroups.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter()
        .append('text')
            .text(function(d) {
                var v = d[valueColumn].toFixed(1);
                if (d[valueColumn] > 0 && v == 0) {
                    v = '<1';
                }
                return v + '%';
            })
            .attr('font-weight', function(d) {
                if (d['label'] == 'ELL Grads') {
                    return 'bold';
                } else {
                    return 400;
                }
            })
            .attr('x', function(d) {
                if (isMobile) {
                    if (d['label'] != 'Total Grads') {
                        return chartWidth + legendSpacer - 2;
                    } else {
                        return chartWidth + legendLabel + (legendSpacer / 2) - 5;
                    }
                } else {
                    if (d['label'] != 'Total Grads') {
                        return chartWidth + legendSpacer;
                    } else {
                        return chartWidth + legendLabel + (legendSpacer * 2);
                    }
                }
            })
            .attr('y', function(d, i) {
                return 0;
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()
                d3.select(this).classed('out', true)
                return valueGap;
            })
            .attr('dy', (barHeight / 2) + 4);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
