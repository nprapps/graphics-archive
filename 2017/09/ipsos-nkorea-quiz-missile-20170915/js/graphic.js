// Global vars
var pymChild = null;
var isMobile = false;

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

    initEvents();
    sendPymMessages();

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
        for (key in d) {
            if (key == 'Group') {
                continue;
            }
            d[key] = +d[key];
        }
    });
}


/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    // Get viewport height for sizing
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;
    var labelWidth = 75;
    var labelGap = 6;
    var numCols = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 1;
    } else {
        isMobile = false;
        numCols = 4;
    }
    graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1)) - labelWidth - labelGap) / numCols);

    if (isMobile){
      var barHeight = 18;
    }
    else{
      var barHeight = 30;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#bar-chart');
    containerElement.html('');

    var charts = d3.keys(DATA[0]).filter(function(d) {
        return d != 'Group';
    });
    charts.forEach(function(d,i) {
        var isCorrect = false;
        if (d == LABELS['correct']) {
            isCorrect = true;
        }

        var thisGraphicWidth = graphicWidth;
        var showLabels = false;
        if (i % numCols == 0) {
            thisGraphicWidth += labelWidth + labelGap;
            showLabels = true;
        }

        // containing div
        var chartElement = containerElement.append('div')
            .attr('class', 'chart ' + classify(d))
            .classed('correct', isCorrect);
        chartElement.attr('style', function() {
            var s = '';
            s += 'width: ' + thisGraphicWidth + 'px; ';
            s += 'float: left; ';
            if (!showLabels) {
                s += 'margin-left: ' + gutterWidth + 'px; ';
            }
            return s;
        });

        // "Correct answer" label
        var annotText = '&nbsp;';
        if (isCorrect) {
            annotText = '<span class="correct">Correct answer</span>';
        }
        var annotHeader = chartElement.append('h4')
            .html(annotText);
        var header = chartElement.append('h3')
            .text(d);
        if (showLabels) {
            annotHeader.attr('style', 'margin-left:' + (labelWidth + labelGap) + 'px;');
            header.attr('style', 'margin-left:' + (labelWidth + labelGap) + 'px;');
        }

        // Render the chart!
        renderBarChart({
            container: '.chart.' + classify(d),
            width: thisGraphicWidth,
            data: DATA,
            dataColumn: d,
            domain: [ 0, 100 ],
            showLabels: showLabels,
            labelWidth: labelWidth,
            labelGap: labelGap,
            barHeight: barHeight
        });
    })

    // Update iframe
    if (pymChild) {
        sendPymMessages();
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'Group';
    var valueColumn = config['dataColumn'];

    var barHeight = config['barHeight'];
    var barGap = 5;
    var labelWidth = config['labelWidth'];
    var labelMargin = config['labelGap'];
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: (labelWidth + labelMargin)
    };

    if (!config['showLabels']) {
        margins['left'] = 0;
    }

    var ticksX = 4;
    var roundTicksFactor = 100;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length) - barGap;

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
    var min = config['domain'][0];

    if (min > 0) {
        min = 0;
    }

    var max = config['domain'][1];

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
            return d.toFixed(0) + '%';
        });

    chartElement.append('g')
        .attr('class', 'bg')
        .selectAll('rect')
        .data(config['data'])
        .enter().append('rect')
            .attr('class', 'bg')
            .attr('x', xScale(xScale.domain()[0]))
            .attr('width', chartWidth)
            .attr('y', function(d,i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight);

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
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
            });

    /*
     * Render bar labels.
     */
    if (config['showLabels']) {
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
    }


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
                return Number(d[valueColumn]).toFixed(0) + '%';
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
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

var sendPymMessages = function() {
    pymChild.sendMessage('get-viewport-height');
};

var sizeQuiz = function(viewportHeight, viewportOffset) {
    // Only do this if the quiz hasn't been answered yet
    if (!d3.select('.quiz-list').classed('answered')) {
        // get viewport height
        var bodyPadding = parseInt(d3.select('body').style('padding-top'));
        var quizWrapHeight = d3.select('#quiz-wrapper').node().getBoundingClientRect().height;
        var modifiedViewport = viewportHeight - viewportOffset;

        // if height of viewport is bigger than height of top-wrapper and quiz wrapper:
        if (modifiedViewport > bodyPadding +  quizWrapHeight) {
            // make quiz-wrapper = viewport_h - top-wrapper
            d3.select('#quiz-wrapper').style('height', (modifiedViewport -  bodyPadding) + 'px');
            // update pym height
            pymChild.sendHeight();
        }
    }
};

var initEvents = function() {
    var quizOptions = d3.selectAll('.quiz-option')
        .select('a')
        .on('click', function() {
            var e = d3.event;
            e.preventDefault();

            if (!d3.select('.quiz-list').classed('answered')) {
                ANALYTICS.trackEvent('quiz-option-clicked');

                d3.select('.quiz-list').classed('answered', true);
                d3.select(this).classed('selected', true);

                d3.select('#quiz-wrapper').style('height', 'auto');

                var responseText = d3.select(this).text();

                window.setTimeout(function() {
                    d3.select('ul.quiz-list').classed('faded', true);

                    window.setTimeout(function() {
                        d3.select('ul.quiz-list').classed('hidden', true);

                        updateResponseText(responseText);
                    }, 700);
                }, 500);

                // triggerScroll();
            }
        });

    pymChild.onMessage('viewport-data', function(d) {
        var parsedData = JSON.parse(d);
        var viewportHeight = parseInt(parsedData['height'], 10);
        var viewportOffset = parseInt(parsedData['offsetTop'], 10);
        sizeQuiz(viewportHeight, viewportOffset);
    });
};

var triggerScroll = function() {
    // Get vertical offset of response paragraph
    var quizWrapHeight = d3.select('#size-wrapper').node().getBoundingClientRect().bottom;
    pymChild.sendMessage('scroll-position', quizWrapHeight);
};

var updateResponseText = function(responseText) {

    String.prototype.uncapitalize = function() {
        return this.charAt(0).toLowerCase() + this.slice(1);
    }

    var loweredText = responseText.uncapitalize();
    var correctText = LABELS['correct'].uncapitalize();

    var userResponse = d3.select('p.user-response');
    var chartContainer = d3.select('#bar-chart');

    if (loweredText == correctText){
        var userValue = 'which is the <strong>correct answer</strong>.';
        var isCorrect = true;
    } else{
        var userValue = 'but the correct answer is <strong>&ldquo;' + correctText + '&rdquo;</strong>';
        var isCorrect = false;
    }

    var responseData = {
        user_response: loweredText,
        user_value: userValue
    };

    var responseTemplateHTML = d3.select('#response-template').html();
    var responseTemplate = _.template(responseTemplateHTML);

    userResponse.classed('hidden', false)
        .html(responseTemplate(responseData));

    chartContainer.classed('hidden', false);

    if (isCorrect) {
        userResponse.classed('fade-in correct', true)
    } else {
        userResponse.classed('fade-in incorrect', true);
    }

    chartContainer.classed('fade-in', true);

    pymChild.sendHeight();
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
