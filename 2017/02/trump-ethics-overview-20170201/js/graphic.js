// Global vars
var pymChild = null;
var isMobile = false;
var isMedium = false;
var fastMode = false;
var thisGraphic;
var animHasStarted = false;
var animHasFinished = false;
var clickedReplay = 0;

var animFrontDelay, animBackDelay;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        pymChild = new pym.Child({
            renderCallback: render
        });

        initEvents(thisGraphic);

        pymChild.onMessage('within-view-window', function() {
            if (!animHasStarted) {
                startTimer(thisGraphic);
            }
        });

        pymChild.sendMessage('check-view-window');
    } else {
        d3.select('#graphic-wrapper').classed('fallback', true);
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

var initEvents = function(thisGraphic) {
    d3.select('#play-button').on('click', function() {
        var e = d3.event;
        e.preventDefault();

        d3.select(this)
            .style('visibility', '')
            .classed('hidden', true);

        resetGraphic(thisGraphic, startTimer);

        // Track clicks on this button
        clickedReplay++;
        ANALYTICS.trackEvent('clicked-replay', clickedReplay.toString());
    });
};

var setWidthVariables = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        isMedium = false;
    } else if (containerWidth <= MEDIUM_THRESHOLD) {
        isMedium = true;
        isMobile = false;
    } else {
        isMobile = false;
        isMedium = false;
    }
}

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    setWidthVariables(containerWidth);

    window.clearTimeout(animFrontDelay);
    window.clearTimeout(animBackDelay);

    if (!pymChild) {
        d3.select('#play-button')
            .style('visibility', '')
            .classed('hidden', true);

        var graphicWidth = document.getElementById('graphic').getBoundingClientRect().width;

        // Render the chart!
        thisGraphic = initGraphic({
             container: '#graphic',
             width: graphicWidth,
             data: DATA
         });
    }

     updateRenderedGraphic();
}

var updateRenderedGraphic = function(){
    var graphicWidth = document.getElementById('graphic').getBoundingClientRect().width;
    thisGraphic.updateLayout(graphicWidth);

    // By default, don't show the graphic
    var hideGraphic = true;

    // If render called after graphic has finished animating, show final state
    if (animHasFinished) {
        hideGraphic = false;
        finishAnimation();
    }

    tweakSizing();
    thisGraphic.preRenderGraphic(hideGraphic);

    // If render is called partway through the animation, start it over
    if (animHasStarted && !animHasFinished) {
        resetGraphic(thisGraphic, startTimer);
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

// Silly hack to keep animation from jumping about
var tweakSizing = function() {
    var paragraphs = document.getElementsByClassName('top-text');
    var maxHeight = d3.max(paragraphs, function(d) {
        return d.getBoundingClientRect().height;
    });

    d3.select('#top-text-wrapper')
        .style('height', maxHeight + 'px');
};

var animationIndex = {
    0: {
        delay: 1600,
        duration: 750,
        backDelay: 3200,
        animateCallback: function(thisGraphic, duration) {
            thisGraphic.showPromiseCircles(duration);
        }
    },
    1: {
        delay: 5000,
        duration: 1000,
        backDelay: 2200,
        animateCallback: function(thisGraphic, duration) {
            thisGraphic.transitionProbationCircles(duration);
        }
    },
    2: {
        delay: 5000,
        duration: 750,
        backDelay: 2200,
        animateCallback: function(thisGraphic, duration) {
            thisGraphic.transitionPromiseCircles(duration);
        }
    },
    3: {
        delay: 5000,
        duration: 2100,
        backDelay: 2200,
        animateCallback: function(thisGraphic, duration) {
            thisGraphic.showEvidenceCircles(duration);
        }
    },
    4: {
        delay: 5000,
        duration: 1400,
        backDelay: 200,
        animateCallback: function(thisGraphic, duration) {
            thisGraphic.showResolutionCircles(duration);
        }
    },
};

var resetGraphic = function(thisGraphic, callback) {
    window.clearTimeout(animFrontDelay);
    window.clearTimeout(animBackDelay);

    thisGraphic.resetAllElements();
    thisGraphic.hideRenderedElements();
    callback(thisGraphic);
};

var startTimer = function(thisGraphic) {
    animHasStarted = true;
    d3.select('#top-text-wrapper').classed('graphic-unseen', false);
    triggerFrame(thisGraphic, 0);
};

var finishAnimation = function() {
    animHasFinished = true;
    d3.select('#play-button')
        .style('visibility', 'visible')
        .classed('hidden', false);
};

// Trigger an animation "frame", that is a certain slide in TEXT_DATA
var triggerFrame = function(thisGraphic, frameNumber) {
    if (frameNumber < TEXT_DATA.length) {
        var frameData = TEXT_DATA[frameNumber];
        var animationData = animationIndex[frameNumber];

        // Hide/show relevant text
        d3.select('.top-text.active').classed('active', false);
        d3.select('.top-text.frame-' + frameNumber).classed('active', true);

        if (fastMode) {
            animationData['delay'] = animationData['delay'] / 100;
            animationData['backDelay'] = animationData['backDelay'] / 100;
        }

        // Get the associated animation index of indices and call that function on the graphic
        animFrontDelay = window.setTimeout(function() {
            animationData['animateCallback'](thisGraphic, animationData['duration'], backCallback);
            backCallback();

            function backCallback() {
                animBackDelay = window.setTimeout(function() {
                    triggerFrame(thisGraphic, frameNumber+1);
                }, animationData['duration'] + animationData['backDelay']);
            }
        }, animationData['delay']);
    } else {
        finishAnimation();
    }
};

/*
 * Render a graphic.
 */
var initGraphic = function(config) {
    var self = {};
    var margins,
        chartWidth, chartHeight,
        columnWidth, circleWidth, lineHeight, lineStroke;
    var mobileOffset;
    var graphicData = config['data'];

    self.calculateLayout = function() {
        margins = {
            top: 20,
            right: isMedium || isMobile ? 100 : 115,
            bottom: 20,
            left: isMobile ? 0 : isMedium ? 100 : 115
        };

        // Calculate actual chart dimensions
        chartWidth = config['width'] - margins['left'] - margins['right'];

        if (isMobile) {
            columnWidth = chartWidth / (graphicData['Total'] - graphicData['Probation']);
        } else {
            columnWidth = chartWidth / graphicData['Total'];
        }
        circleWidth = .55 * columnWidth;
        lineHeight  = 30;
        lineStroke = 2;

        if (isMobile) {
            mobileOffset = Math.ceil((3 * circleWidth) + (1 * lineHeight));
            chartHeight = Math.ceil((3 * circleWidth) + (2 * lineHeight)) + mobileOffset;
        } else {
            chartHeight = Math.ceil((3 * circleWidth) + (2 * lineHeight));
        }
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Get layout calculations based on the current width
    self.calculateLayout();

    // Create container
    var svgElement = containerElement.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom']);

    // Initialize textures
    var textureStroke = isMobile ? 2 : 3;
    var lineTexture = textures.lines()
        .size(3 * textureStroke)
        .strokeWidth(textureStroke)
        .stroke('#222');

    svgElement.call(lineTexture);

    // Add check circle as svg def
    var svgDefs = svgElement.append('defs');
    var checkIcon = d3.select('#check-circle-svg').select('path').node().cloneNode(true);
    var appendedDef = svgDefs.node()
        .appendChild(checkIcon);

    d3.select(appendedDef)
        .attr('id', 'def-check-circle');

    var chartElement = svgElement.append('g')
        .attr('class', 'chart-g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    self.updateLayout = function(containerWidth) {
        config['width'] = containerWidth;
        self.calculateLayout();

        svgElement
            .attr('width', chartWidth + margins['left'] + margins['right'])
            .attr('height', chartHeight + margins['top'] + margins['bottom']);

        svgElement.select('g.chart-g').remove();
        chartElement = svgElement.append('g')
            .attr('class', 'chart-g')
            .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');
    };

    self.preRenderGraphic = function(hideGraphic) {
        var totalCount = graphicData['Total'];
        var probationCount = graphicData['Probation'];
        var evidenceCount = graphicData['Evidence'];

        // Draw circles and links
        self.renderPromiseCircles(totalCount, probationCount);
        self.renderPromiseFills(totalCount, probationCount);
        self.renderEvidenceCircles(totalCount, probationCount);
        self.renderEvidenceFills(probationCount, evidenceCount);
        self.renderResolutionCircles(totalCount, probationCount);

        // Add probation box and labeling
        _drawProbationBox(probationCount);

        // Hide everything!
        if (hideGraphic) {
            self.hideRenderedElements();
        } else {
            self.transitionProbationCircles(0);
            self.transitionPromiseCircles(0);
            self.showEvidenceCircles(0);
        }
    };

    // INITIAL RENDER: Initialize all circles
    self.renderPromiseCircles = function(totalCount, probationCount) {
        _drawCircleRow(totalCount, probationCount, 0);
        _addLabel('Statement', 0);

        var thisStageCircles = chartElement.selectAll('circle.stage-0');
        thisStageCircles
            .classed('stage-probation', function(d,i) {
                return i < probationCount;
            });
    };

    // INITIAL RENDER: Fill in non-probation circles
    self.renderPromiseFills = function(totalCount, probationCount) {
        var thisStageCircles = chartElement.selectAll('.circle-g.stage-0');

        _addFilledCircles(thisStageCircles, probationCount, 0, 0, totalCount - probationCount);
    };

    // INITIAL RENDER: Add stage 2 (evidence) circles
    self.renderEvidenceCircles = function(totalCount, probationCount) {
        var circleCount = totalCount - probationCount;

        _drawLinkRow(circleCount, probationCount, 1, probationCount);
        _drawCircleRow(circleCount, probationCount, 1, probationCount);
        _addLabel('Evidence', 1);
    };

    // INITIAL RENDER: Fill in evidence circle
    self.renderEvidenceFills = function(probationCount, evidenceCount) {
        var thisStageCircles = chartElement.selectAll('.circle-g.stage-1');

        _addFilledCircles(thisStageCircles, probationCount, 1, probationCount, evidenceCount);
    };

    // INITIAL RENDER: Add stage 3 (resolution) circles
    self.renderResolutionCircles = function(totalCount, probationCount) {
        var circleCount = totalCount - probationCount;

        _drawLinkRow(circleCount, probationCount, 2, probationCount);
        _drawCircleRow(circleCount, probationCount, 2, probationCount);
        _addLabel('Resolution', 2);
    };

    // HIDE ALL ELEMENTS FOR ANIMATED TRANSITION
    self.hideRenderedElements = function() {
        // Set stroke-dasharray on circles
        var circleCircumference = 2 * Math.PI * (circleWidth / 2);
        chartElement.selectAll('.circle-outline')
            .style('opacity', 0)
            .style('stroke-dasharray', '0 ' + circleCircumference);

        chartElement.selectAll('.link-segment')
            .style('opacity', 0)
            .style('stroke-dasharray', '0 ' + lineHeight);

        chartElement.selectAll('.category-label')
            .style('opacity', 0);

        chartElement.selectAll('.probation-label')
            .style('opacity', 0);

        chartElement.selectAll('.probation-box')
            .style('opacity', 0);
    }

    self.resetAllElements = function() {
        var circleGroup0 = chartElement.selectAll('.circle-g.stage-0');
        var circleGroup1 = chartElement.selectAll('.circle-g.stage-1');
        _resetFilledCircles(circleGroup0, 0);
        _resetFilledCircles(circleGroup1, 1);

        var probationCircles = chartElement.selectAll('.circle-outline.stage-probation');

        probationCircles
            .style('fill-opacity', 0)
            .style('fill', 'white')
            .style('stroke', '#306572');
    }

    self.showPromiseCircles = function(duration) {
        var circleCircumference = 2 * Math.PI * (circleWidth / 2);

        chartElement.selectAll('.circle-outline.stage-0')
            .style('opacity', 1)
            .transition()
                .duration(duration)
            .style('stroke-dasharray', circleCircumference + ' ' + circleCircumference);

        chartElement.select('.category-label.stage-0')
            .transition()
                .duration(duration)
            .style('opacity', 1);
    }

    self.transitionProbationCircles = function(duration) {
        var probationCircles = chartElement.selectAll('.circle-outline.stage-probation');

        probationCircles
            .style('fill-opacity', 0)
            .style('fill', lineTexture.url())
            .transition()
                .duration(duration)
            .style('stroke', '#222')
            .style('fill-opacity', 1);

        chartElement.selectAll('.probation-box,.probation-label')
            .transition()
                .duration(duration)
            .style('opacity', 1);
    };

    self.transitionPromiseCircles = function(duration) {
        var circleGroup = chartElement.selectAll('.circle-g.stage-0');
        _transitionFilledCircles(circleGroup);
    }

    self.showEvidenceCircles = function(duration) {
        var circleCircumference = 2 * Math.PI * (circleWidth / 2);

        chartElement.selectAll('.link-segment.stage-1')
            .style('opacity', 1)
            .transition()
                .duration(duration/3)
            .style('stroke-dasharray', lineHeight + ' ' + lineHeight);

        chartElement.selectAll('.circle-outline.stage-1')
            .style('opacity', 1)
            .transition()
                .duration(duration/3)
            .style('stroke-dasharray', circleCircumference + ' ' + circleCircumference);

        chartElement.select('.category-label.stage-1')
            .transition()
                .duration(duration * 2/3)
            .style('opacity', 1);

        self.transitionEvidenceCircles(duration * 2/3);
    }

    self.transitionEvidenceCircles = function(duration) {
        var circleGroup = chartElement.selectAll('.circle-g.stage-1');
        _.delay(_transitionFilledCircles, duration, circleGroup);
    };

    self.showResolutionCircles = function(duration) {
        var circleCircumference = 2 * Math.PI * (circleWidth / 2);

        chartElement.selectAll('.link-segment.stage-2')
            .style('opacity', 1)
            .transition()
                .duration(duration/2)
            .style('stroke-dasharray', lineHeight + ' ' + lineHeight);

        chartElement.selectAll('.circle-outline.stage-2')
            .style('opacity', 1)
            .transition()
                .duration(duration/2)
            .style('stroke-dasharray', circleCircumference + ' ' + circleCircumference);

        chartElement.select('.category-label.stage-2')
            .transition()
                .duration(duration)
            .style('opacity', 1);
    }

    function _drawProbationBox(probationCount) {
        var xPosition = 0;
        var boxMargin = isMobile || isMedium ? (columnWidth - circleWidth) / 2 : lineHeight / 2;
        var boxHeight = isMobile ? mobileOffset : chartHeight + boxMargin;
        var boxWidth;

        if (isMobile) {
            boxWidth = (chartWidth + margins['right']) - 2;
        } else if (isMedium) {
            boxWidth = margins['left'] + columnWidth * probationCount;
            xPosition = -margins['left'];
        } else {
            boxWidth = columnWidth * probationCount;
        }

        chartElement.append('rect')
            .attr('class', 'probation-box')
            .attr('width', boxWidth)
            .attr('height', boxHeight)
            .attr('x', xPosition)
            .attr('y', -boxMargin);

        var textY = isMobile ? circleWidth + boxMargin + boxMargin : circleWidth + lineHeight;
        var textLineHeight = isMobile ? 14 : 18;
        var textX = isMedium ? boxWidth + xPosition - boxMargin : xPosition + boxMargin;

        chartElement.append('text')
            .attr('class', 'probation-label')
            .attr('text-anchor', isMedium ? 'end' : 'start')
            .attr('x', textX)
            .attr('y', textY)
            .text("Four issues cannot be resolved with a simple action; rather, they apply to the entire course of President Trump's term")
            .call(wrapText, boxWidth - (boxMargin * 2), textLineHeight);
    }

    function _addLabel(labelText, stage) {
        if (isMobile) {
            var yPosition =  mobileOffset + (stage * (circleWidth + lineHeight)) + (circleWidth / 2);
        } else {
            var yPosition = (stage * (circleWidth + lineHeight)) + (circleWidth / 2);
        }

        chartElement.append('text')
            .attr('class', 'category-label stage-' + stage)
            .attr('x', chartWidth)
            .attr('y', yPosition)
            .attr('dy', 5)
            .text(labelText);
    }

    function _drawCircleRow(circlesToDraw, probationCount, stage, offsetNumber) {
        offsetNumber = offsetNumber || 0;

        for (var i=0; i<circlesToDraw; i++) {
            if (isMobile) {
                if (stage == 0 && i < probationCount) {
                    var xPosition = (offsetNumber * columnWidth) + (i * columnWidth) + (columnWidth / 2);
                    var yPosition = (stage * (circleWidth + lineHeight)) + (circleWidth / 2);
                } else {
                    var xPosition = ((offsetNumber - probationCount) * columnWidth) + (i * columnWidth) + (columnWidth / 2);
                    var yPosition = mobileOffset + (stage * (circleWidth + lineHeight)) + (circleWidth / 2);
                }
            } else {
                var xPosition = (offsetNumber * columnWidth) + (i * columnWidth) + (columnWidth / 2);
                var yPosition = (stage * (circleWidth + lineHeight)) + (circleWidth / 2);
            }

            chartElement.append('g')
                .attr('class', 'circle-g stage-' + stage)
                .append('circle')
                    .attr('class', 'circle-outline stage-' + stage)
                    .attr('r', circleWidth/2)
                    .attr('cx', xPosition)
                    .attr('cy', yPosition)
                    .attr('transform', 'rotate(-90,' + xPosition + ',' + yPosition + ')');
        }
    }

    function _drawLinkRow(linksToDraw, probationCount, stage, offsetNumber) {
        offsetNumber = offsetNumber || 0;

        for (var i=0; i<linksToDraw; i++) {
            if (isMobile) {
                var xPosition = ((offsetNumber - probationCount) * columnWidth) + (i * columnWidth) + (columnWidth / 2);
                var y1Position = mobileOffset + ((stage - 1) * (circleWidth + lineHeight)) + circleWidth + lineStroke;
                var y2Position = mobileOffset + (stage * (circleWidth + lineHeight));
            } else {
                var xPosition = (offsetNumber * columnWidth) + (i * columnWidth) + (columnWidth / 2);
                var y1Position = ((stage - 1) * (circleWidth + lineHeight)) + circleWidth + lineStroke;
                var y2Position = (stage * (circleWidth + lineHeight));
            }

            chartElement.append('line')
                .attr('class', 'link-segment stage-' + stage)
                .attr('x1', xPosition)
                .attr('x2', xPosition)
                .attr('y1', y1Position)
                .attr('y2', y2Position);
        }
    }

    function _addFilledCircles(circleGroup, probationCount, stage, offsetNumber, fillCount) {
        // Figure out the factor by which icon will need to be scaled
        //var defWidth = d3.select('#def-check-circle').node().getBBox().width;
        var defWidth = 297;
        var widthScale = circleWidth / defWidth;
        var groupTotal = circleGroup[0].length;

        circleGroup[0].forEach(function(d,i) {
            var thisIndex = i;
            if (isMobile) {
                var xPosition = ((offsetNumber - probationCount) * columnWidth) + (thisIndex * columnWidth) + (columnWidth / 2) - (defWidth/2);
                var yPosition = mobileOffset + (stage * (circleWidth + lineHeight)) + (circleWidth / 2) - (defWidth / 2);
            } else {
                var xPosition = (offsetNumber * columnWidth) + (thisIndex * columnWidth) + (columnWidth / 2) - (defWidth/2);
                var yPosition = (stage * (circleWidth + lineHeight)) + (circleWidth / 2) - (defWidth / 2);
            }
            var initScale = 0.0001;

            if (i >= (groupTotal - fillCount)) {
                d3.select(d).append('use')
                    .attr('xlink:href', '#def-check-circle')
                    .attr('class', 'circle-filled stage-' + stage)
                    .attr('data-orig-x', xPosition)
                    .attr('data-orig-y', yPosition)
                    .attr('x', xPosition)
                    .attr('y', yPosition)
                    .attr('transform', _transformAroundCenter(initScale, xPosition + defWidth/2, yPosition + defWidth/2));
            }
        });
    }

    function _resetFilledCircles(circleGroup, stage) {
        // Figure out the factor by which icon will need to be scaled
        //var defWidth = d3.select('#def-check-circle').node().getBBox().width;
        var defWidth = 297;
        var widthScale = circleWidth / defWidth;
        var groupTotal = circleGroup[0].length;

        circleGroup.selectAll('.circle-filled')
                .attr('transform', function(d,i) {
                    var xPosition = +d3.select(this).attr('data-orig-x');
                    var yPosition = +d3.select(this).attr('data-orig-y');
                    var widthScale = 0.0001;

                    return _transformAroundCenter(widthScale, xPosition + defWidth/2, yPosition + defWidth/2);
                });
    }

    function _transitionFilledCircles(circleGroup) {
        // Figure out the factor by which icon will need to be scaled
        //var defWidth = d3.select('#def-check-circle').node().getBBox().width;
        var defWidth = 297;
        var widthScale = circleWidth / defWidth;
        var groupTotal = circleGroup[0].length;

        circleGroup.selectAll('.circle-filled')
            .transition()
                .duration(800)
                .attr('transform', function() {
                    var xPosition = +d3.select(this).attr('x');
                    var yPosition = +d3.select(this).attr('y');
                    return _transformAroundCenter(widthScale, xPosition + defWidth/2, yPosition + defWidth/2);
                });
    }

    function _transformAroundCenter(factor, centerX, centerY) {
        return 'translate(' + (-centerX * (factor-1)) + ', ' + (-centerY * (factor-1)) + ') scale(' + factor + ')';
    }

    self.chartElement = chartElement;

    return self;
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
