// Global vars
var pymChild = null;
var isMobile = false;
var currentStep = 0;
var numSteps = 0;

var btnBack = null;
var btnNext = null;
var btnStart = null;
var btnRestart = null;
var steps = null;
var graphicWrapper = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    btnBack = d3.select('#btn-back');
    btnNext = d3.select('#btn-next');
    graphicWrapper = d3.select('#graphic');
    steps = d3.selectAll('.step');
    numSteps = steps[0].length - 1;

    btnBack.on('click', backSlide);
    btnNext.on('click', nextSlide);

    toggleSteps();

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

var backSlide = function() {
    if (currentStep > 0) {
        currentStep--;
        toggleSteps();
    }
};

var nextSlide = function() {
    if (currentStep < numSteps) {
        currentStep++;
    } else {
        currentStep = 0;
    }
    toggleSteps();
};

var toggleSteps = function() {
    // show/hide steps
    steps.style('display', function(d, i) {
        if (i == currentStep) {
            return 'block';
        } else {
            return 'none';
        }
    });

    // show/hide buttons
    if (currentStep == 0) {
        btnBack.classed('hidden', true);
    } else {
        btnBack.classed('hidden', false);
    }

    if (currentStep == numSteps) {
        btnNext.classed('hidden', true);
    } else {
        btnNext.classed('hidden', false);
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
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
    var barHeight = 30;

    // Loop through data for each quiz question...
    CHART_DATA.forEach(function(d,i) {
        var containerElement = d3.select('#result-' + i);
        containerElement.html('');

        var chartKeys = d3.keys(d[0]).filter(function(d) {
            return d != 'Group';
        });

        // Loop over each response to quiz question to chart results
        chartKeys.forEach(function(chartKey, chart_i) {
            var correctAnswer = QUESTION_DATA[i]['correct_answer'];
            var questionType = QUESTION_DATA[i]['question_type'];

            if (containerWidth <= MOBILE_THRESHOLD) {
                isMobile = true;
                numCols = 2;
            } else {
                if (questionType == 'true_false') {
                    isMobile = false;
                    numCols = 3;
                } else {
                    isMobile = false;
                    numCols = 5;
                }
            }

            graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1)) - labelWidth - labelGap) / numCols);

            var thisGraphicWidth = graphicWidth;
            var isCorrect;
            (chartKey.toLowerCase() === correctAnswer.toLowerCase()) ? isCorrect = true : isCorrect = false;

            // Add a container div for each response's chart
            var chartElement = containerElement.append('div')
                .attr('class', 'result-' + i + ' chart chart-' + classify(chartKey))
                .classed('correct', isCorrect);

            var showLabels = false;
            if (chart_i % numCols == 0) {
                thisGraphicWidth += labelWidth + labelGap;
                showLabels = true;
            }

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
                .text(chartKey);
            if (showLabels) {
                annotHeader.attr('style', 'margin-left:' + (labelWidth + labelGap) + 'px;');
                header.attr('style', 'margin-left:' + (labelWidth + labelGap) + 'px;');
            }

            // Render the chart!
            renderBarChart({
                container: '.result-' + i + '.chart.' + 'chart-' + classify(chartKey),
                width: thisGraphicWidth,
                data: d,
                dataColumn: chartKey,
                domain: [ 0, 100 ],
                showLabels: showLabels,
                labelWidth: labelWidth,
                labelGap: labelGap,
                barHeight: barHeight
            });
        });
    });

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
            .attr('dy', (barHeight / 2) + 3);
}

var sendPymMessages = function() {
    pymChild.sendMessage('get-viewport-height');
};

var initEvents = function() {
    var quizOptions = d3.selectAll('.quiz-option')
        .select('a')
        .on('click', function() {
            var e = d3.event;
            e.preventDefault();

            var thisQuizList = this.parentNode.parentNode;
            var thisParentStep = thisQuizList.parentNode.parentNode;
            
            if (!d3.select(thisQuizList).classed('answered')) {
                ANALYTICS.trackEvent('quiz-option-clicked');

                d3.select(thisQuizList).classed('answered', true);
                d3.select(this).classed('selected', true);

                var responseText = d3.select(this).text();
                var isCorrect = d3.select(this.parentNode).classed('correct');

                window.setTimeout(function() {
                    d3.select(thisQuizList).classed('faded', true);

                    window.setTimeout(function() {
                        d3.select(thisQuizList).classed('hidden', true);

                        updateResponseText(thisParentStep, responseText, isCorrect);
                    }, 700);
                }, 500);

            }
        });
};

var updateResponseText = function(responseParent, responseText, isCorrect) {
    var questionNumber = +responseParent.dataset['step'];
    var questionData = QUESTION_DATA[questionNumber];

    var loweredText = responseText.uncapitalize();
    var correctText = questionData['correct_answer'];

    var responseWrapper = d3.select(responseParent).select('.response-wrapper');
    var userResponse = responseWrapper.select('p.user-response');
    var chartContainer = responseWrapper.select('.graphic');
    var userValue;

    if (isCorrect) {
        userValue = 'which is the <strong>correct answer</strong>.';
    } else {
        userValue = 'but the correct answer is <strong>&ldquo;' + correctText.toProperCase() + '.&rdquo;</strong>';
    }

    var textOutput;
    (responseText === "Don’t know") ? textOutput = loweredText : textOutput = responseText;

    var responseData = {
        user_response: textOutput,
        user_value: userValue,
        correct_respondents: questionData['correct_respondents']
    };

    var responseTemplateHTML = d3.select('#response-template').html();
    var responseTemplate = _.template(responseTemplateHTML);

    userResponse.classed('hidden', false)
        .html(responseTemplate(responseData));

    chartContainer.classed('hidden', false);

    if (isCorrect) {
        userResponse.classed('fade-in correct', true);
    } else {
        userResponse.classed('fade-in incorrect', true);
    }

    chartContainer.classed('fade-in', true);

    pymChild.sendHeight();
};

String.prototype.uncapitalize = function() {
    return this.charAt(0).toLowerCase() + this.slice(1);
}

// From stack overflow https://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
