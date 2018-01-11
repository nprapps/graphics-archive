// Global vars
var pymChild = null;
var isMobile = false;

/**
 * Get a single item d3 selection from another selection, by common slug.
 *
 * @param {d3.selection} selection - D3 selection
 * @param {string} slug - Slug to use to find the matching element.
 *
 * @returns {d3.selection} - Selection containing an element whose datum
 *   has a `slug` property matching the `slug` argument.
 */
var selectBySlug = function(selection, slug) {
  return selection.select(function(d) {
      if (d['slug'] == slug) {
          return this;
      };

      return null;
  });
};

/**
 * Calculate the difference between the user's selected value and the
 * actual value.
 */
var calculateDifference = function (data, value) {
    var actualValue = _.find(data, function (d) {
        return d['user_selects'];
    })['end_amt'];

    return actualValue - value;
};

var getBarClass = function(d) {
    var classes = [];

    if (d['draggable']) {
        classes.push('draggable');
    }

    if (d['user_selects']) {
        classes.push('actual');
    }

    return classes.join(' ');
}

/**
 * Returns an initial application state object.
 */
var getInitialState = function (data) {
    var state = {
        // True if the actual value has been shown to the user
        actualValueAnimated: false,

        // True if the draggable bar has been animated to a visible
        // width
        animationShown: false,

        // Once the chart is rendered, the container width in pixels
        containerWidth: null,

        // Data that will be rendered in the chart.
        data: [],

        // Once the user submits the value, the difference between
        // the guessed and actual value
        difference: null,

        // Should the drag icon be rendered?
        // Values:
        // * hidden: Animate the icons in
        // * visible: Just show the icons
        // * removed: They were shown and removed. Don't re-render.
        dragIconVisibility: 'hidden',

        // True if user has started dragging the bar and then stopped
        userHasStartedFirstDrag: false,

        // True if user has started dragging the bar initially
        userHasStartedFirstDrag: false,

        // Once the user has started dragging the bar, the current value
        // of the bar
        value: null,

        // True if the user has submitted a value
        valueSelected: false
    };

    // Initialize the data to chart
    // We need extra logic here because we're adding the draggable bar and
    // hiding the actual value bar.

    // We're going to store the order of the bar in the data because we
    // don't always iterate over all the bars, so the `i` argument in
    // the callback won't always indicate overall bar order. Knowing
    // the bar's order is important for things like positioning the drag icon.
    var barOrder = 0;

    DATA.forEach(function (d) {
        if (d['user_selects']) {
            // Make a copy of the data that will be used for the draggable
            // bar.
            state['data'].push(_.extend({}, d, {
                amt: 0,
                label: LABELS['user_selects_label'],
                // Set this flag on the copy to false so we can
                // differentiate between the original value and the new
                // one.
                user_selects: false,
                label_hidden: true,
                draggable: true,
                slug: d['slug'] + '-draggable',
                order: barOrder
            }));
            barOrder += 1;

            state['data'].push(_.extend({}, d, {
                label: LABELS['actual_value_label'],
                label_hidden: true,
                bar_hidden: true,
                order: barOrder
            }));
            barOrder += 1;

            return;
        };

        state['data'].push(_.extend({}, d, {
            order: barOrder
        }));
        barOrder += 1;
    });

    return state;
};

/*
 * Check whether padding should be added to the bottom of the graphic
 * to push the story text offscreen before a user has selected their
 * answer.
 */
var checkViewportSizing = function(parentInfo, pymChild, state) {
    // If user hasn't selected a value yet, create properly-sized padding
    // below the graphic to hide storytext
    if (!state['valueSelected']) {
        // Add padding to the bottom of the child iframe that is equivalent to the
        // parent viewport height minus the height of the graphic.
        // Create a state variable hasSizedViewport that is set to viewport spacing value
        var parentInfoArray = parentInfo.split(' ');
        var parentHeight = +parentInfoArray[1];
        var graphicHeight = document.getElementById('graphic-wrapper').getBoundingClientRect().bottom;
        var childPadding = parentHeight - graphicHeight;

        // Check if this value has changed. If so, resize spacing value.
        if (state['hasSizedViewport'] != childPadding) {
            // Add spacing to graphic
            d3.select('body')
                .style('padding-bottom', childPadding + 'px');

            // Set the state to equal the new spacing value
            state['hasSizedViewport'] = childPadding;

            // Trigger pym parent resize
            pymChild.sendHeight();
        }
    }
};


/**
 * Show the footer element which usually contains source and credits.
 *
 * The footer should already be rendered in the HTML of the page and
 * should start with `display: none` specified.
 *
 * @param {string|Element} container - D3 selectable string or DOM element
 *     that is the container for the footer element.
 * @param {number} fadeDuration - Duration to use, in milliseconds to
 *   fade in the footer.  If not set, the element will be shown immediately.
 * @param {Object} state - Object that tracks application state between
 *   renders.
 * @param {boolean} state.valueSelected - If true, show the footer.
 * @param {boolean} force - Show the footer, regardless of the value of
 *   state.valueSelected.
 *
 */
var showFooter = function (container, fadeDuration, state, force) {
    var footer = d3.select(container);
    fadeDuration = fadeDuration || 0;

    if ((!state && !force) || !state['valueSelected']) {
        // The user has not selected a value yet and we're not forcing
        // display.  Do nothing.
        return;
    }

    footer.call(fadeIn, fadeDuration);
};

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        // Keep state for our interactive in a single place.
        // This is needed because the chart might get re-rendered due to
        // screen resizes and we want to make sure that state changes are
        // reflected during re-renders.
        var state = getInitialState(DATA);

        // We want to have our different elements, like the bar chart and the
        // user response to talk to each other.  Let's use `d3.dispatch` and
        // custom events to do this.
        var dispatch = d3.dispatch(
            'onscreen',
            'animationend',
            'dragstart',
            'dragend',
            'selectvalue'
        );

        // Create a scale that can be used to contextualize the user's pick.
        // The domain and range are defined in the spreadsheet.
        var contextScale = d3.scale.threshold()
            .domain(
                LABELS['threshold_domain'].split(',').map(function (val) {
                    return parseInt(val, 10);
                })
            )
            .range(
                LABELS['threshold_range'].split(',').map(function (s) {
                    return s.trim();
                })
            );

        // Response that tells user how close or far their estimate was
        // from the actual value.
        var estimateTemplate = _.template(LABELS['user_value_context']);

        // Animation duration, in milliseconds, used in the chart and the response
        var animDuration = 400;

        // We'll want to re-render the user response based on a few different
        // events.  Create a version of `renderResponse` with our
        // parameters pre-filled.  The stuff that changes from invocation to
        // invocation is all in `state`.
        var renderResponseWithParams = _.partial(
            renderResponse,
            {
                container: '#response',
                buttonContainer: '#button-wrapper',
                submitButtonLabel: LABELS['submit_button_label'],
                transitionText: LABELS['transition_text'],
                contextScale: contextScale,
                estimateTemplate: estimateTemplate,
                dispatch: dispatch,
                state: state,
                animDuration: animDuration
            }
        );

        // The Pym.js callback takes only one argument, the width of the container.
        // However, we want to pass some additional information (that doesn't change)
        // to our render function.  Create a version that sets the additional
        // parameters with values we know now, but keeps the container width
        // as an argument.
        var renderCallback = _.partial(
            render,
            _,
            renderResponseWithParams,
            showFooter.bind(null, '.footer', animDuration, state),
            dispatch,
            state,
            animDuration // QUESTION this feels like the wrong place for this
        );

        // Generally, we'll handle user interactions within components like this:
        //
        // * Listen for event
        // * Update state
        // * Call render function


        // When the user starts dragging the bar, ping Google Analytics
        dispatch.on('dragstart', function () {
            if (state['userHasStartedFirstDrag']) {
                // If we've already started dragging once before, don't
                // re-send the event.
                return;
            }

            state['userHasStartedFirstDrag'] = true;

            ANALYTICS.trackEvent('you-drag-it-drag');
        });

        // When a user stops dragging the bar, show a submit button
        dispatch.on('dragend', function(val) {
            state['value'] = val;
            renderResponseWithParams();

            state['userHasEndedFirstDrag'] = true;
        });

        // When the user clicks the submit button, update the output.
        // This will include showing the hidden bars and a response
        // message.
        dispatch.on('selectvalue', function () {
            // Set a flag to indicate the user has selected a value.
            state['valueSelected'] = true;

            // Update the data to indicate that all bars should be shown.
            state['data'].forEach(function (d) {
                if (d['user_selects']) {
                    d['end_amt'] = d['amt'];
                    d['amt'] = 0;
                }

                d['bar_hidden'] = false;
            });

            state['difference'] = calculateDifference(
                state['data'],
                state['value']
            );

            // Calculate the response
            renderCallback(state['containerWidth']);

            ANALYTICS.trackEvent(
                'you-drag-it-submit',
                state['value'].toString()
            );
        });

        // When the animation has been shown, set a flag so it isn't shown
        // again.
        dispatch.on('animationend', function () {
            state['animationShown'] = true;
        });

        pymChild = new pym.Child({
            renderCallback: renderCallback
        });

        // Set up visibility tracking.
        // This requires loading the pymchild-scroll-visibility library
        // See https://github.com/nprapps/pymchild-scroll-visibility
        var tracker = new PymChildScrollVisibility.Tracker(
            'bar-chart',
            function () {
                // When the element is visible, tell other components via
                // the `onscreen` event.
                // This kicks off the animation.  The handler makes sure
                // that this works.
                dispatch.onscreen();
            },
            null,
            {
                // Trigger visibility when the element is fully visible,
                // rather than when it first comes into the viewport.
                partial: false
            }
        );

        // Track the iframe position
        // In order for this to work, we need set the `data-pym-trackscroll`
        // attribute on the pym container.
        // The functionality that reads that attribute and sets the appropriate
        // configuration options when loading Pym is in
        // `npr-pym-loader`.
        pymChild.onMessage('viewport-iframe-position', function(parentInfo) {
            checkViewportSizing(parentInfo, pymChild, state);
            tracker.checkIfVisible(parentInfo);
        });

        // Request parentPositionInfo from Pym to trigger visibility check on graphic load
        pymChild.sendMessage('parentPositionInfo');
    } else {
        // We have JavaScript support, but no SVG.  Show the fallback image.
        // Usually, we would just use the fallback image rendered in the HTML
        // but we don't want to give away the value in the chart if the
        // fallback image renders before the JavaScript executes.
        d3.select('#bar-chart').append('img')
            .attr('src', 'fallback.png')
            .attr('alt', '[Chart]')
            .attr('class', 'fallback');

        renderResponse({
            container: '#response',
            transitionText: LABELS['transition_text'],
            fallback: true
        });

        // Show the footer without any animation
        showFooter('.footer', null, null, true);

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
        d['amt'] = +d['amt'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 *
 * @param {number} containerWidth - the width of the container, from Pym.js
 * @param {function} renderResponseComponent - Function that renders the
 *   response to the user after they interact with the chart.
 * @param {function} showFooter - Function that shows the footer (source
 *   and credits) after the user selects a value in the chart.
 * @param {dispatch} dispatch - d3.dispatch object for message passing
 * @param {Object} state - Application state that should persist between calls.
 * @param {number} animDuration - Duration for fade animations, in
 *   milliseconds
 */
var render = function (
        containerWidth,
        renderResponseComponent,
        showFooter,
        dispatch,
        state,
        animDuration
  ) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }
    // Save our width for later so we can call this render function explicitly
    // as well as having it be called by Pym when the container width changes.
    // We call this render function explicitly, for example, after the
    // user submits their value.
    state['containerWidth'] = containerWidth;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Base graphic width on actual graphic container
    var graphicWidth = document.getElementById('bar-chart').getBoundingClientRect().width;

    // Render the chart!
    renderBarChart({
        container: '#bar-chart',
        state: state,
        width: graphicWidth,
        dispatch: dispatch,
        animDuration: animDuration
    });

    // Render the user response
    renderResponseComponent();

    // Show the footer
    showFooter();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/**
 * Animate the bars into view.
 *
 * @param {d3.selection} selection - D3 selection containing bar chart bar
 *     SVG elements.
 * @param {d3.scale.linear} xScale - D3 scale used to calculate the width
 *     of the bar.
 * @param {string} valueColumn - Datum property containing the value used
 *     for the bar width.
 * @param {function} onAnimationEnd - Callback that will be called when
 *     the animation has completed.  This is called for each element
 *     in `selection`.
 */
var animateBars = function (
    selection,
    xScale,
    valueColumn,
    onAnimationEnd
) {
    // TODO: Adjust easing and duration for smoother animation
    var animationSteps = [
        {
            value: 80,
            duration: 1800,
            ease: 'quad'
        },
        {
            value: 26,
            duration: 1000,
            ease: 'back'
        },
        {
            value: 44,
            duration: 1500,
            ease: 'bounce'
        }
    ];

    var barTransition = selection;
    animationSteps.forEach(function (step) {
        barTransition = barTransition.transition()
            .duration(step['duration'])
            .ease(step['ease'])
            .attr('width', xScale(step['value']));
    });
    barTransition
        .each('end', function (d,i) {
            // Set value in data from the width at which our animation finally arrives
            var barX = d3.select(this).attr('width');
            d['x'] = barX;
            d[valueColumn] = xScale.invert(barX);

            onAnimationEnd.call(this, d, i);
        });
};

/*
 * Fade in an element that was previously hidden.
 *
 * @param {d3.selection} selection - D3 selection containing elements to be
 *     faded in.
 * @param {number} duration - Duration in milliseconds over which the
 *     animation will take place.
 *
 */
var fadeIn = function(selection, duration) {
    var currentSelection = selection
        .style('opacity', 0)
        .style('display', 'block');

    currentSelection.transition()
        .duration(duration)
        .style('opacity', 1);
};

/*
 * Fade out an element and hide it.
 *
 * @param {d3.selection} selection - D3 selection containing elements to be
 *     faded in.
 * @param {number} duration - Duration in milliseconds over which the
 *     animation will take place.
 *
 */
var fadeOut = function(selection, duration) {
    selection.transition()
        .duration(duration)
        .style('opacity', 0)
        .each('end', function() {
            d3.select(this)
                .style('display', 'none');

            // TODO accept optional callback?
        });
};

/**
 * Update the width of the chart bars.
 */
var updateBar = function(selection, xScale, valueColumn) {
    selection
        .attr('width', function(d) {
            return Math.abs(xScale(0) - xScale(d[valueColumn]));
        })
        .style('display', function(d) {
            return d['bar_hidden'] ? 'none' : null;
        });
};

var renderBars = function (
    selection,
    xScale,
    valueColumn,
    labelColumn,
    barHeight,
    barGap,
    colors,
    userGuessTexture,
    state
) {
    selection.append('g')
        .attr('class', 'bars')
        .attr('transform', 'translate(0,' + barGap + ')')
        .selectAll('rect')
        .data(state['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('fill', function(d, i) {
                if (d['draggable']) {
                    return userGuessTexture.url();
                } else if (d['user_selects']) {
                    return COLORS['red3'];
                } else {
                    return '#ccc';
                }
            })
            .attr('fill-opacity', function(d,i) {
                if (d['draggable'] && state['actualValueAnimated']) {
                    return 0.7;
                }
                return 1;
            })
            .call(updateBar, xScale, valueColumn)
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                var classes = ['bar-' + i,
                               classify(d[labelColumn])];

                classes.push(getBarClass(d));

                return classes.join(' ');
            });
};

var renderZeroLine = function (selection, xScale, chartHeight) {
    selection.append('line')
        .attr('class', 'zero-line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', 0)
        .attr('y2', chartHeight);
};

/**
 * Update the position and visibility of bar value labels.
 */
var updateValues = function(
    selection,
    xScale,
    valueColumn,
    valueGap,
    chartWidth
) {
    selection
        .attr('x', function(d) {
            return xScale(d[valueColumn]);
        })
        .text(function(d) {
            return d[valueColumn].toFixed(0) + '%';
        })
        .attr('dx', function(d) {
            var xStart = xScale(d[valueColumn]);
            var textWidth = this.getComputedTextLength()

            // Negative case
            if (d[valueColumn] < 0) {
                var outsideOffset = -(valueGap + textWidth);

                if (xStart + outsideOffset < 0) {
                    d3.select(this).classed('out', false)
                    d3.select(this).classed('in', true)
                    return valueGap;
                } else {
                    d3.select(this).classed('in', false)
                    d3.select(this).classed('out', true)
                    return outsideOffset;
                }
            // Positive case
            } else {
                if (xStart + valueGap + textWidth > chartWidth) {
                    d3.select(this).classed('out', false)
                    d3.select(this).classed('in', true)
                    return -(valueGap + textWidth);
                } else {
                    d3.select(this).classed('in', false)
                    d3.select(this).classed('out', true)
                    return valueGap;
                }
            }
        })
        .style('display', function (d) {
            return d['label_hidden'] ? 'none' : null;
        });
};

var renderBarLabels = function (
    selection,
    barHeight,
    barGap,
    state
) {
    selection.append('g')
            .attr('class', 'labels')
        .selectAll('text')
        .data(state['data'])
        .enter()
        .append('text')
            .text(function(d) {
                return d['label'];
            })
            .attr('class', function(d,i) {
                return classify(d['label']) + ' ' + getBarClass(d);
            })
            .style('display', function (d) {
                if (d['user_selects']) {
                    return state['actualValueAnimated'] ? 'block' : 'none';
                }
                return 'block';
            })
            .attr('y', function(d,i) {
                return i * (barHeight + barGap) + barGap;
            })
            .attr('dy', -8);
};

/**
 * Render bar values.
 */
var renderValues = function(
    selection,
    xScale,
    valueColumn,
    valueGap,
    chartWidth,
    barHeight,
    barGap,
    state
) {
    selection.append('g')
            .classed('value', true)
            .attr('transform', 'translate(0,' + barGap + ')')
        .selectAll('text')
        .data(state['data'])
        .enter()
        .append('text')
            .attr('class', getBarClass)
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dy', (barHeight / 2) + 3)
            .call(updateValues, xScale, valueColumn, valueGap, chartWidth);
};

var renderDragIcon = function (selection) {
    var dragIcon = selection.append('g')
            .attr('class', 'drag-icon');

    dragIcon.append('path')
        .attr('class', 'drag-arrow-left')
        .attr('d', 'M7,0L7,14L0,7Z')
        .attr('transform', 'translate(-10,0)');

    dragIcon.append('path')
        .attr('class', 'drag-arrow-right')
        .attr('d', 'M0,0L7,7L0,14Z')
        .attr('transform', 'translate(3,0)');
};

var revealActualValue = function(
    selection,
    xScale,
    valueColumn,
    valueGap,
    chartWidth,
    valueGroup,
    labelGroup,
    draggableBar,
    animDuration,
    state
) {
    var barDuration = 800;
    selection.transition()
        .attr('width', function(d) {
            return xScale(d['end_amt']);
        })
        .duration(barDuration)
        .each('end', function(d) {
            state['actualValueAnimated'] = true;
            d['amt'] = d['end_amt'];

            valueGroup.selectAll('text')
                .call(updateValues, xScale, valueColumn, valueGap, chartWidth);

            valueGroup.select('.actual').call(fadeIn, animDuration);
            labelGroup.select('.actual').call(fadeIn, animDuration);
            d['label_hidden'] = false;
        });

    draggableBar.transition()
        .style('fill-opacity', 0.7)
        .duration(barDuration);
};


var dragBehavior = function (
    xScale,
    valueColumn,
    valueGap,
    chartWidth,
    xMax,
    dragIcon,
    animDuration,
    barGroup,
    valueGroup,
    dispatch,
    state
) {
    return d3.behavior.drag()
        .on('dragstart', function (d) {
            // Dragging has started
            d3.event.sourceEvent.stopPropagation;

            // Check to see if user has already dragged
            if (state['userHasStartedFirstDrag']) {
                return;
            }

            // Remove the drag icons
            if (dragIcon) {
                dragIcon.call(fadeOut, animDuration);
                dragIcon.remove();
                state['dragIconVisibility'] = 'removed';
            }

            // Show the bar value
            // Fade in the value
            valueGroup.select('.draggable')
                .call(fadeIn, animDuration);
            // Set the label hidden flag to false so the label will be
            // displayed if this is re-rendered do to a viewport resize
            d['label_hidden'] = false;
            dispatch.dragstart();
        })
        .on('drag', function (d) {
          d3.select(this)
            // We only set the `cx` attribute so we can only drag horizontally
            .attr('cx', function(d) {
                d.x = d3.event.x;

                if (d.x < 0) {
                  d.x = 0;
                }
                else if (d.x > xMax) {
                  d.x = xMax;
                }

                // QUESTION Should we factor this out into a separate function?
                // Update the value based on the handle position
                d[valueColumn] = xScale.invert(d.x);
                // Update the value label
                valueGroup.selectAll('text')
                    .call(updateValues, xScale, valueColumn, valueGap, chartWidth);
                // Update the bar width
                barGroup.selectAll('rect')
                    .call(updateBar, xScale, valueColumn);

                return d.x;
            });
        })
        .on('dragend', function (d) {
            dispatch.dragend(d[valueColumn]);
        });
};

/*
 * Render a bar chart.
 *
 * @param {Object} config - Configuration object that defines chart rendering
 * @param {string|Element} config.container - CSS selector or DOM element
 *   where the chart SVG will be rendered.
 * @param {number} config.containerWidth - Width of container element in pixels.
 * @param {Object} config.dispatch - D3 dispatch object for message passing
 * @param {Object} config.state - Object that tracks
 *   state between renders.
 *
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var barHeight = 70;
    var barGap = 40;
    var labelWidth = 85;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 20,
        right: isMobile ? 17 : 20,
        bottom: 0,
        left: isMobile ? 10 : 20
    };

    var ticksX = 4;
    var roundTicksFactor = 25;

    var state = config['state'];

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = (barHeight + barGap) * config['state']['data'].length;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html(null);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var svgElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom']);

    var chartElement = svgElement.append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 scale objects.
     */
    var min = d3.min(state['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    // X-Axis should always go to 100 to avoid giving users a hint about the
    // unknown value.
    var max = 100;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .tickValues([0, 25, 50, 75, 100])
        .tickFormat(function(d) {
            return d.toFixed(0) + '%';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, 0))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    /*
     * Initialize SVG textures
     */
    var userGuessTexture = textures.lines()
        .background(COLORS['red3'])
        .stroke(COLORS['red4'])
        .heavier()
        .thicker();

    svgElement.call(userGuessTexture);

    /*
     * Render bars to chart.
     */
    var barGroup = chartElement.call(
        renderBars,
        xScale,
        valueColumn,
        labelColumn,
        barHeight,
        barGap,
        COLORS,
        userGuessTexture,
        state
    ).select('.bars');

    var draggableBar = chartElement.select('rect.draggable');
    var actualBar = chartElement.select('rect.actual');

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.call(renderZeroLine, xScale, chartHeight);
    }

    /*
     * Render bar labels
     */
    var labelGroup = chartElement.call(
        renderBarLabels,
        barHeight,
        barGap,
        state
    ).select('.labels');

    /*
     * Render bar values.
     */
    var valueGroup = chartElement.call(
        renderValues,
        xScale,
        valueColumn,
        valueGap,
        chartWidth,
        barHeight,
        barGap,
        state
    ).select('.value');

    if (state['valueSelected'] && !state['actualValueAnimated']) {
        actualBar.call(
            revealActualValue,
            xScale,
            valueColumn,
            valueGap,
            chartWidth,
            valueGroup,
            labelGroup,
            draggableBar,
            config['animDuration'],
            state
        );
    }

    // The rest of the code after here deals with animating bars and setting
    // up the dragging behavior.  If we've already selected the values, we
    // can just stop now!
    if (state['valueSelected']) {
        return;
    }

    // Render dragging handle

    // Render some bouncing arrows to draw the user's attention to the drag
    // handles.
    if (state['dragIconVisibility'] != 'removed') {
        var dragIcon = chartElement.call(renderDragIcon)
            .select('.drag-icon');
    }

    // Set up dragging behavior.
    // See https://bl.ocks.org/mbostock/6123708
    var xMax = xScale(100);
    var drag = dragBehavior(
        xScale,
        valueColumn,
        valueGap,
        chartWidth,
        xMax,
        dragIcon,
        config['animDuration'],
        barGroup,
        valueGroup,
        config['dispatch'],
        state
    );
    var dragHandles = chartElement.append('g')
          .attr('class', 'handle')
        .selectAll('circle')
        .data(state['data'])
        .enter()
        .append('circle')
            .attr('cy', function(d, i) {
                return (i * (barHeight + barGap)) + (barHeight / 2);
            })
            .style('display', 'none')
            .attr('r', barHeight / 2)
            .attr('transform', 'translate(0,' + barGap + ')')
            .call(drag);

    // For a given draggable bar, position the corresponding handle.
    // This is designed to passed to `selection.each()` or a similar
    // method.
    var showDragHandle = function (d) {
        var correspondingHandle = selectBySlug(dragHandles, d['slug']);

        correspondingHandle
            .attr('cx', xScale(d['amt']))
            .style('display', function(d) {
                // HACK: It would be nice to just not even render the
                // element for the non-draggable bars, but I don't think that's
                // possible with the way the data bind works.
                // So, just hide the handle for the non-draggable bars.
                return d['draggable'] ? null : 'none';
            });

        if (dragIcon) {
            // We need to get the bounding box of dragIcon, but getBBox() fails
            // in Firefox if the element is hidden. So we briefly set it to
            // display: block before setting it to the proper display value.
            dragIcon
                .style('visibility', 'hidden')
                .style('display', 'block');

            var dragIconBBox = dragIcon.node().getBBox();
            var handleY = barGap + (d['order'] * (barHeight + barGap)) + (barHeight/2) - (dragIconBBox.height / 2);

            dragIcon
                .style('visibility', 'visible')
                .style('display', state['dragIconVisibility'] === 'hidden' ? 'none' : 'block')
                .attr('transform', 'translate(' + xScale(d['amt']) + ', ' + handleY + ')');

            if (state['dragIconVisibility'] == 'hidden') {
                dragIcon.call(fadeIn, config['animDuration']);
                state['dragIconVisibility'] = 'visible';
            }
        }
    };

    if (state['animationShown']) {
        // We've already shown the animation.  Don't show it again.
        // We need to do this because this code will get re-called when
        // we re-render.

        // But do position the "handles" at the updated position of
        // the bar.
        draggableBar.each(showDragHandle);

        // Return early before we get to the bar animation code
        return;
    }

    // We haven't shown the animation.  Wait until the chart container comes
    // on screen and then show it.
    config['dispatch'].on('onscreen', function () {
        if (state['animationShown']) {
          // If we've already shown the animation and the `onscreen` event is
          // getting ereoneously fired for some reason, do nothing.
          return;
        }

        draggableBar.call(animateBars, xScale, valueColumn, function (d)  {
            showDragHandle(d);
            valueGroup.select('.draggable')
                .call(updateValues, xScale, valueColumn, valueGap, chartWidth);

            config['dispatch'].animationend();
        });
    });
};

/*
 * Render the user response.
 *
 * @param {Object} config - Configuration object that defines chart rendering
 * @param {string|Element} config.container - CSS selector or DOM element
 *   where the response button and text will be rendered.
 * @param {string|Element} config.buttonContainer - CSS selector or DOM element
 *   where the submit button will be placed.
 * @param {function} config.contextScale - D3 scale function that maps between
 *   the user's selected value and a "human" sounding label.
 * @param {boolean} fallback - Render this in fallback mode, when the user
 *    has JavaScript support, but not SVG support.
 * @param {Object} config.dispatch - D3 dispatch object for message passing
 * @param {Object} config.state - Object that tracks
 *   state between renders.
 *
 */
var renderResponse = function(config) {
    var container = d3.select(config['container']);
    var buttonContainer = d3.select(config['buttonContainer']);
    var state = config['state'];

    // Clear existing contents
    container.html(null);
    buttonContainer.html(null);

    if (config['fallback']) {
        // We're not showing the interactive chart.  Just render the
        // transition text.
        container.append('div')
            .attr('class', 'transition-text')
            .html(config['transitionText']);
    }

    if (state['value'] && !state['valueSelected']) {
        buttonContainer.append('button')
            .text(config['submitButtonLabel'])
            .on('click', function () {
                config['dispatch'].selectvalue();
            });

        if (!state['userHasEndedFirstDrag']) {
            buttonContainer.call(fadeIn, config['animDuration']);
        }

        return;
    }

    if (state['valueSelected']) {
        // Get a human readable version of the difference between the user's
        // guess and the actual value.  This would be something
        // like "too low" or "about right".
        var differenceLabel = config['contextScale'](state['difference']);

        container.append('div')
            .attr('class', 'estimate-context')
            .html(config['estimateTemplate']({
                differenceLabel: differenceLabel
            }));

        container.append('div')
            .attr('class', 'transition-text')
            .html(config['transitionText']);

        container.call(fadeIn, config['animDuration']);

        // Remove spacing at bottom of body and resize pymChild
        d3.select('body')
            .transition()
                .duration(config['animDuration'])
                .style('padding-bottom', '0px')
                .each('end', function() {
                    pymChild.sendHeight();
                });
    }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
