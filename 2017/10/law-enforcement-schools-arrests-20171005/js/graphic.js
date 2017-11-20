/*
TODO:
- dot tooltips?
*/

// Global vars
var pymChild = null;
var isMobile = false;
var stateSelector = null;
var stateInfo = null;
var stateValues = [];
stateValues['leo'] = [];

// needs to match what's in the css for .dots circle
var inactiveFillOpacity = 0.1;
var inactiveStrokeOpacity = 0.5;

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
    var stringKeys = [ 'label', 'category', 'gender' ];
    var nonStateKeys = [ 'national_avg', 'gender', 'max', 'min' ];

    DATA.forEach(function(d) {
        var values = [];
        for (key in d) {
            if (!_.contains(stringKeys, key)) {
                // null out state values that were exported from jupyter as 'NaN'
                if (d[key] == 'NaN') {
                    d[key] = null;
                }
                // convert non-null values to a Number
                if (d[key] != null) {
                    d[key] = +d[key];
                }
                // populate an array of values for each state
                if (!_.contains(nonStateKeys, key) && !isNaN(d[key]) && d[key] != null) {
                    values.push({ 'state': key,
                                  'value': d[key],
                                  'national_avg': d['national_avg'],
                                  'gender': d['gender'] });
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

    // identify categories
    var categories = _.uniq(_.pluck(DATA, 'category'));

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    categories.forEach(function(d,i) {
        var cData = DATA.filter(function(v,k) {
            return v['category'] == d;
        });

        containerElement.append('div')
            .attr('class', classify(d) + ' dot-chart');

        renderDotChart({
            container: '.dot-chart.' + classify(d),
            width: containerWidth,
            data: cData,
            valueData: stateValues[d]
        });
    });

    // In our raw data, states are sorted by USPS abbreviation.
    // For the select input, we need to sort them by their full
    // name.
    // Perhaps we could just call `sort()` on the input array,
    // but it sorts in place and I'm scared to mutate data.
    // Mapping also saves us from having to compute the full
    // name when we render the `<option>` elements.
    var selectorStates = stateValues['leo'][12].map(function(d) {
      return {
        state: d['state'],
        stateFull: statePostalToFull(d['state'])
      };
    }).sort(function(a, b) {
      if (a.stateFull < b.stateFull) {
        return -1;
      }

      if (a.stateFull > b.stateFull) {
        return 1;
      }

      return 0;
    });
    initStateSelector(
        stateSelector,
        selectorStates,
        // Default to South Carolina, since this is the focus of the story
        'SC'
    );

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
    var valueColumn = 'national_avg';
    var minColumn = 'min';
    var maxColumn = 'max';

    var barHeight = 40;
    var barGap = 5;
    var barShift = 0;
    var labelWidth = 130;
    var labelMargin = 15;
    var valueMinWidth = 30;
    var stateDotRadius = 5;

    var ticksX = 6;
    var roundTicksFactor = 5;

    if (isMobile) {
        // labelWidth = 60;
        labelWidth = 0;
        labelMargin = stateDotRadius + 2;
        barHeight = 75;
        barShift = 10; // height of bar labels
        ticksX = 4;
    }

    var margins = {
        top: 10,
        right: 15,
        bottom: 45,
        left: (labelWidth + labelMargin)
    };

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
    var max = 25;

    var xScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ 0, chartWidth ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d.toFixed(0);
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

    // label bottom axis
    chartElement.append('text')
        .text(LABELS['annot_rate'])
        .attr('class', 'x-annot')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 40);

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
                return 'dots dots-' + i + ' ' + classify(config['data'][i][labelColumn]) + ' ' + config['data'][i]['gender'];
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
            // vals.push(sorted[0], sorted[sorted.length - 1]);
            // only label the largest one, rather than the first + last
            vals.push(sorted[sorted.length - 1]);
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

    // national average marker
    stateDots.selectAll('line')
        .data(function(d, i) {
            return [ d[0] ];
        })
        .enter().append('line')
            .attr('class', function(d, i) {
                return 'average';
            })
            .attr('x1', function(d, i) {
                return xScale(d['national_avg']);
            })
            .attr('x2', function(d, i) {
                return xScale(d['national_avg']);
            })
            .attr('y1', function(d, i) {
                var val = (barHeight / 2) - 10;
                return val;
            })
            .attr('y2', function(d, i) {
                var val = (barHeight / 2) + 10;
                return val;
            });

    chartElement.select('.dots-0')
        .append('text')
        .text(LABELS['annot_national_avg'])
        .attr('class', 'average')
        .attr('x', xScale(config['data'][0]['national_avg']))
        .attr('y', (barHeight / 2) - 15);

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
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
                    return '<strong>' + d[labelColumn] + '</strong>';
                });
}

/**
 * Populate a `<select>` element with `<option>` elements for states.
 *
 * @param {selection} selector - D3 selection for the `<select>` element.
 * @param {Object[]} data - Objects representing states.
 * @param {string} data[].state - State postal code for the state.
 * @param {string} data[].stateFull - Full name of the state.
 * @param {string} initialState - State postal code for state that should
 *   be initially selected.  If undefined, a default "Select one ..." option
 *   will be added.
 */
var initStateSelector = function(selector, data, initialState) {
    selector.html('');

    if (!initialState) {
        selector.append('option')
            .attr('selected', 'selected')
            .html(LABELS['select_one']);
    }

    // TODO: Use d3 selection and data bind here to be more
    // conventional, but it does get a little tricky with the
    // 'Select one' option.
    data.forEach(function(d,i) {
        selector.append('option')
            .attr('value', d['state'])
            .property('selected', initialState && d['state'] === initialState)
            .html(d['stateFull']);
    });

    selector.on('change', highlightState);

    if (initialState) {
      // If an initial state is specified, call the event handler to update
      // everything else.
      // For more on this pattern, see
      // https://github.com/d3/d3/issues/100#issuecomment-13008969
      selector.each(highlightState);
    }
};

var highlightState = function() {
    // deactivate previous active circles
    d3.selectAll('circle.active')
        .classed('active', false)
        .transition()
            .duration(100)
            .style('fill-opacity', inactiveFillOpacity)
            .style('stroke-opacity', inactiveStrokeOpacity);

    d3.selectAll('text.state-value').remove();

    // reset key
    d3.select('.key .key-1')
        .classed('active', false);

    d3.select('.key .key-2 label')
        .text(LABELS['key_states']);

    // if this is a valid selection, show the state info
    if (d3.select(this).property('value') != LABELS['select_one']) {
        var selected = d3.select(this).property('value');
        var labels = d3.selectAll('.labels li');

        // fade out rows with no data
        var rows = d3.selectAll('.dots');
        rows.each(function(d,i) {
            var thisRow = d3.select(this);
            var thisRowLabel = d3.select(labels[0][i]);
            var hasData = false;

            d.forEach(function(v,k) {
                if (v['state'] == selected) {
                    hasData = true;
                }
            });

            if (!hasData) {
                thisRow.classed('active', false);
                thisRowLabel.classed('active', false);
            } else {
                thisRow.classed('active', true);
                thisRowLabel.classed('active', true);
            }
        });

        // highlight new ones
        var dots = d3.selectAll('circle.' + selected)
            .moveToFront()
            .classed('active', function(d, i) {
                // add value annotation
                var thisDot = d3.select(this);
                var thisParent = d3.select(this.parentNode);

                var val = d['value'].toFixed(1);
                if (i == 0) {
                    val = statePostalToAP(d['state']) + ': ' + val;
                }

                var dotLabelClasses = 'state-value ' + d['state'];
                var dotLabel = thisParent.append('text')
                    .text(val)
                    .attr('x', thisDot.attr('cx'))
                    .attr('y', (+thisDot.attr('cy') + 18))
                    .attr('class', dotLabelClasses);

                // prevent labels running off the side on mobile. hi, Alaska.
                var dotPos = dotLabel.node().getBBox();
                if (dotPos.x < 0) {
                    dotLabel.classed('left', true);
                    dotLabel.attr('x', -5);
                }

                return true;
            })
            .transition()
                .duration(250)
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
            .text(LABELS['key_other']);
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
