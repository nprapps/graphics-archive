// Global vars
var pymChild = null;
var isMobile = false;
var stateSelector = null;
var stateInfo = null;
var stateValues = [];
stateValues['age'] = [];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        stateSelector = d3.select('select.state-selector');
        stateInfo = d3.select('.state-info');

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
    DATA.forEach(function(d) {
        var values = [];
        for (key in d) {
            if (key != 'label' && key != 'category' && key != 'national_avg') {
                if (d[key] != null) {
                    d[key] = +d[key];
                }
                if(key != 'median' && key != 'min' && key != 'max' && !isNaN(d[key]) && d[key] != null) {
                    values.push({ 'state': key, 'value': d[key] });
                }
            }
        }
        stateValues[d['category']].push(values);
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
    var categories = DATA.map(function(c) {
        return c['category'];
    });
    categories = d3.set(categories).values();

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    categories.forEach(function(d,i) {
        var cData = DATA.filter(function(v,k) {
            return v['category'] == d;
        });

        containerElement.append('div')
            .attr('class', classify(d) + ' procedure-chart');

        renderDotChart({
            container: '.procedure-chart.' + classify(d),
            width: containerWidth,
            data: cData,
            valueData: stateValues[d]
        });
    });

    initStateSelector(stateValues['age'][2]);

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
    var valueColumn = 'median';
    var minColumn = 'min';
    var maxColumn = 'max';

    var barHeight = 50;
    var barGap = 5;
    var barShift = 0;
    var labelWidth = 130;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var stateDotRadius = 5;

    if (isMobile) {
        // labelWidth = 60;
        labelWidth = 0;
        barHeight = 80;
        barShift = 20;
    }

    var margins = {
        top: 20,
        right: 15,
        bottom: 50,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 6;
    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 4;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

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
    var min = 0;
    var max = 4;

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
            return d.toFixed(1);
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
                return xScale(d[minColumn]);
            })
            .attr('x2', function(d, i) {
                return xScale(d[maxColumn]);
            })
            .attr('y1', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2) + barShift;
            })
            .attr('y2', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2) + barShift;
            });

    /*
     * Render annotations
     */
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');

    annotations.append('text')
        .attr('class', 'label-top')
        .attr('x', xScale(1))
        .attr('dx', -10)
        .attr('text-anchor', 'end')
        .attr('y', -10)
        .html('&lsaquo; Cheaper');

    annotations.append('text')
        .attr('class', 'label-top')
        .attr('x', xScale(1))
        .attr('dx', 10)
        .attr('text-anchor', 'begin')
        .attr('y', -10)
        .html('More expensive &rsaquo;');

    annotations.append('text')
        .attr('class', 'national-avg')
        .attr('x', xScale(1))
        .attr('y', chartHeight)
        .attr('dy', 35)
        .text('National average');

    annotations.append('line')
        .attr('class', 'national-avg')
        .attr('x1', xScale(1))
        .attr('y1', -margins['top'])
        .attr('x2', xScale(1))
        .attr('y2', chartHeight);


    /*
     * Render dots to chart.
     */
    // state dots
    var stateDots = chartElement.append('g')
        .attr('class', 'state-dots')
        .selectAll('g')
        .data(config['valueData'])
        .enter().append('g')
            .attr('class', function(d,i) {
                return 'dots dots-' + i;
            })
            .attr('transform', function(d,i) {
                var val = (i * (barHeight + barGap)) + barShift;
                return 'translate(0,' + val + ')';
            });

    stateDots.selectAll('circle')
        .data(function(d) {
            return d;
        })
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['value']);
            })
            .attr('cy', (barHeight / 2))
            .attr('r', stateDotRadius)
            .attr('class', function(d,i) {
                var c = d['state'];
                if (d['value'] > 1.5) {
                    c += ' color-1';
                } else if (d['value'] > 1.1) {
                    c += ' color-2';
                } else if (d['value'] > 1) {
                    c += ' color-3';
                } else if (d['value'] > 0.9) {
                    c += ' color-4';
                } else {
                    c += ' color-5'
                }

                return c;
            });

    stateDots.selectAll('text')
        .data(function(d) {
            var vals = [];
            var sorted = _.sortBy(d, 'value');
            vals.push(sorted[0], sorted[sorted.length - 1]);
            return vals;
        })
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d['value']);
            })
            .attr('y', (barHeight / 2) - 9)
            .text(function(d) {
                return statePostalToAP(d['state']);
            });

    /*
     * Render bar labels.
     */
    chartWrapper
        .append('ul')
        .attr('class', 'labels')
        .attr('style', function() {
            if (isMobile) {
                return formatStyle({
                    'top': margins['top'] + 'px',
                    'left': '0'
                });
            } else {
                return formatStyle({
                    'width': labelWidth + 'px',
                    'top': margins['top'] + 'px',
                    'left': '0'
                });
            }
        })
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                if (isMobile) {
                    return formatStyle({
                        // 'width': labelWidth + 'px',
                        // 'height': barHeight + 'px',
                        'left': '0px',
                        'top': (i * (barHeight + barGap)) + 'px;'
                    });
                } else {
                    return formatStyle({
                        'width': labelWidth + 'px',
                        'height': barHeight + 'px',
                        'left': '0px',
                        'top': (i * (barHeight + barGap)) + 'px;'
                    });
                }
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .html(function(d) {
                    if (isMobile) {
                        return '<strong>' + d[labelColumn] + '</strong> <i>National average: ' + d['national_avg'] + '</i>';
                    } else {
                        return '<strong>' + d[labelColumn] + '</strong> <i>Average: ' + d['national_avg'] + '</i>';
                    }
                });
}

var initStateSelector = function(data) {
    stateSelector.html('');

    stateSelector.append('option')
        .attr('selected', 'selected')
        .html('Select one&hellip;');

    data.forEach(function(d,i) {
        stateSelector.append('option')
            .attr('value', d['state'])
            .html(statePostalToFull(d['state']));
    });

    stateSelector.on('change', highlightState);
}

var highlightState = function() {
    // reset state info box
    stateInfo.html('');
    stateInfo.classed('active', false);

    // deactivate previous active circles
    d3.selectAll('circle.active')
        .classed('active', false)
        .transition()
            .duration(100)
            // .style('stroke', '#bababa')
            // .style('fill', '#bababa')
            .style('fill-opacity', 0.2)
            .style('stroke-opacity', 0.4);

    d3.selectAll('text.state-value').remove();

    // move medians back to the front of the stack
    d3.selectAll('circle.median')
        .moveToFront();

    d3.selectAll('.value.median')
        .classed('active', true);

    // reset key
    d3.select('.key .key-1')
        .classed('active', false);

    d3.select('.key .key-2 label')
        .text('Average price in individual states');

    // if this is a valid selection, show the state info
    if (d3.select(this).property('selectedIndex') > 0) {
        var selected = d3.select(this).property('value')

        // highlight new ones
        var dots = d3.selectAll('circle.' + selected)
            .moveToFront()
            .classed('active', function(d) {
                // add value annotation
                var thisDot = d3.select(this);
                var thisParent = d3.select(this.parentNode);

                thisParent.append('text')
                    .text(d['value'].toFixed(2))
                    .attr('x', thisDot.attr('cx'))
                    .attr('y', (+thisDot.attr('cy') + 18))
                    .attr('class', 'state-value ' + d['state']);

                return true;
            })
            // .call(showStateValue)
            .transition()
                .duration(250)
                // .style('stroke', COLORS['orange2'])
                // .style('fill', COLORS['orange3'])
                .style('fill-opacity', 1)
                .style('stroke-opacity', 1);

        stateInfo.classed('active', true);
        stateInfo.append('h3')
            .text(statePostalToFull(selected));

        d3.select('.key .key-1')
            .classed('active', true)
            .select('label')
                .text('In ' + statePostalToFull(selected));

        d3.select('.key .key-2 label')
            .text('In other states');
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Move a set of D3 elements to the front of the canvas.
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
