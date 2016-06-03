/*
 TODO
 - Edit frequency/other text in spreadsheet
*/

// Global vars
var pymChild = null;
var isMobile = false;
var stateSelector = null;
var stateInfo = null;
var stateValues = [];
stateValues['age'] = [];
stateValues['race'] = [];

var TITLE = [];
TITLE['age'] = 'By age group';
TITLE['race'] = 'By race and ethnicity';

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
    pymChild.onMessage('scroll-depth', function(percent) {
        ANALYTICS.trackEvent('scroll-depth', percent);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        var values = [];
        for (key in d) {
            if (key != 'label' && key != 'category') {
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
    var containerElement = d3.select('#dot-chart');
    containerElement.html('');

    categories.forEach(function(d,i) {
        var cData = DATA.filter(function(v,k) {
            return v['category'] == d;
        });

        containerElement.append('div')
            .attr('class', classify(d) + ' vision-chart');

        renderDotChart({
            container: '.vision-chart.' + classify(d),
            width: containerWidth,
            data: cData,
            valueData: stateValues[d],
            title: TITLE[d]
        });
    });

    initStateSelector(stateValues['age'][0]);

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

    var barHeight = 45;
    var barGap = 5;
    var barShift = 0;
    var labelWidth = 115;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var stateDotRadius = 4;
    var medianDotRadius = 6;


    if (isMobile) {
        // labelWidth = 60;
        labelWidth = 0;
        barHeight = 65;
        barShift = 4;
    }

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 6;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h3')
        .text(config['title']);

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
    var max = 100;

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
            return d + '%';
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
                return d['state'];
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
                return d['state'];
            });

    // median dot
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter()
            .append('line')
            .attr('class', function(d) {
                return 'median ' + classify(d['category']);
            })
            .attr('x1', function(d, i) {
                return xScale(d[valueColumn])
            })
            .attr('x2', function(d, i) {
                return xScale(d[valueColumn])
            })
            .attr('y1', function(d, i) {
                var val = i * (barHeight + barGap) + (barHeight / 2) - 6 + barShift;
                return val;
            })
            .attr('y2', function(d, i) {
                var val = i * (barHeight + barGap) + (barHeight / 2) + 6 + barShift;
                return val;
            });
        // .enter().append('circle')
        //     .attr('class', function(d) {
        //         return 'median ' + classify(d['category']);
        //     })
        //     .attr('cx', function(d, i) {
        //         return xScale(d[valueColumn]);
        //     })
        //     .attr('cy', function(d, i) {
        //         return i * (barHeight + barGap) + (barHeight / 2);
        //     })
        //     .attr('r', medianDotRadius);

    /*
     * median values.
     */
    chartElement.append('g')
        .attr('class', 'value median active')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d,i) {
                var val = i * (barHeight + barGap) + (barHeight / 2) + 20 + barShift;
                return val;
            })
            .text(function(d) {
                return d[valueColumn].toFixed(0) + '%';
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
                    return d[labelColumn];
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
            .style('stroke', '#bababa')
            .style('fill', '#bababa')
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
        .text('Share of students screened in individual states');

    // if this is a valid selection, show the state info
    if (d3.select(this).property('selectedIndex') > 0) {
        var selected = d3.select(this).property('value')

        d3.selectAll('.value.median')
            .classed('active', false);

        // highlight new ones
        var dots = d3.selectAll('circle.' + selected)
            .moveToFront()
            .classed('active', function(d) {
                // add value annotation
                var thisDot = d3.select(this);
                var thisParent = d3.select(this.parentNode);

                thisParent.append('text')
                    .text(d['value'] + '%')
                    .attr('x', thisDot.attr('cx'))
                    .attr('y', (+thisDot.attr('cy') + 20))
                    .attr('class', 'state-value ' + d['state']);

                return true;
            })
            // .call(showStateValue)
            .transition()
                .duration(250)
                .style('stroke', COLORS['orange2'])
                .style('fill', COLORS['orange3'])
                .style('fill-opacity', 1)
                .style('stroke-opacity', 1);

        // show state-specific details
        var reqs = null;
        var numReqs = REQUIREMENTS.length;
        for (var i = 0; i < numReqs; i++) {
            if (REQUIREMENTS[i]['state'] == selected) {
                reqs = REQUIREMENTS[i];
                break;
            }
        }

        stateInfo.classed('active', true);
        stateInfo.append('h3')
            .text(statePostalToFull(selected));

        // requirements
        var stateInfoReqs = stateInfo.append('div')
            .attr('class', 'detail');

        stateInfoReqs.append('h4')
            .text('Screening Or Exam Required');

        var stateReqs = stateInfoReqs.append('ul');
        stateReqs.append('li')
            .html('<strong>Pre-school:</strong> ' + reqs['required_prek']);
        stateReqs.append('li')
            .html('<strong>School age:</strong> ' + reqs['required_school']);

        // frequency
        if (reqs['frequency']) {
            var stateInfoFreq = stateInfo.append('div')
                .attr('class', 'detail');
            stateInfoFreq.append('h4')
                .text('Frequency');
            stateInfoFreq.append('p')
                .attr('class', 'frequency')
                .text(reqs['frequency']);
        }

        if (reqs['other']) {
            var stateInfoOther = stateInfo.append('div')
                .attr('class', 'detail');
            stateInfoOther.append('h4')
                .text('Other Notes');
            stateInfoOther.append('p')
                .attr('class', 'other')
                .text(reqs['other']);
        }

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
