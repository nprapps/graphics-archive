// Global vars
var pymChild = null;
var isMobile = false;
var isPromo = false;
var skipLabels = [ 'label', 'label_fmt', "type" ];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (d3.select('body').classed('promo')) {
        isPromo = true;
    }

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
        for (key in d) {
            if (!_.contains(skipLabels, key)) {
                d[key] = +d[key];
            }
        }
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
    renderDotChart({
        container: '#dot-chart',
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
var renderDotChart = function(config) {
    /*
     * Setup
     */

     console.log(config['data'])

    var allCategories = d3.keys(config['data'][0]).filter(function(d) {
        if (!_.contains(skipLabels, d)) {
            return d;
        }
    });

    categories = allCategories.slice(0,2)

    console.log(categories)


    var labelColumn = 'label';
    var valueColumn = 'amt';
    var minColumn = categories[0];
    var maxColumn = categories[1];

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 180;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;
    var extraSpace = 65;

    var ticksX = 4;

    var margins = {
        top: 5,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    if (isMobile) {
        barHeight = 45;
        labelMargin = 20;
        labelWidth = 100;
        margins['left'] = (labelWidth + labelMargin);
        margins['right'] = 15;
        ticksX = 6;
    }

    if (isPromo) {
        barHeight = 35;
        labelWidth = 100;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length + extraSpace);

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
    var min = 60;
    var max = 100;

    var xScale = d3.scale.linear()
        .domain([ min, max ])
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
                if (i < 2) {
                    var extraSpaceCurrent = 0 
                }
                else {
                    var extraSpaceCurrent = extraSpace
                }
                return i * (barHeight + barGap) + (barHeight / 2) + extraSpaceCurrent;
            })
            .attr('y2', function(d, i) {
                if (i < 2) {
                    var extraSpaceCurrent = 0 
                }
                else {
                    var extraSpaceCurrent = extraSpace
                }
                return i * (barHeight + barGap) + (barHeight / 2) + extraSpaceCurrent;
            });

    /*
     * Render dots to chart.
     */
    var dots = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('g')
        .data(categories)
        .enter().append('g')
            .attr('class', function(d, i) {
                return classify(d);
            });
    dots.selectAll('circle')
        .data(function(d, i) {
            var dotData = _.pluck(config['data'], d);
            return dotData;
        })
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d);
            })
            .attr('cy', function(d, i) {
                if (i < 2) {
                    var extraSpaceCurrent = 0 
                }
                else {
                    var extraSpaceCurrent = extraSpace
                }
                return i * (barHeight + barGap) + (barHeight / 2) + extraSpaceCurrent;
            })
            .attr('r', dotRadius)
            .attr("class", function(d, i) {
                return classify(config['data'][i]["type"])
            });

    /*
     * Render dot values.
     */
    _.each(['shadow', 'value'], function(cls) {
        var dotValues = chartElement.append('g')
            .attr('class', cls)
            .selectAll('g')
            .data(categories)
            .enter().append('g')
                .attr('class', function(d, i) {
                    return classify(d);
                });
        dotValues.selectAll('text')
            .data(function(d, i) {
                var dotData = _.pluck(config['data'], d);
                return dotData;
            })
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d);
            })
            .attr('y', function(d,i) {
                if (i < 2) {
                    var extraSpaceCurrent = 0 
                }
                else {
                    var extraSpaceCurrent = extraSpace
                }
                return i * (barHeight + barGap) + (barHeight / 2) + 3 + extraSpaceCurrent;
            })
            .attr('dx', function(d,i) {
                var pClass = d3.select(this.parentNode).attr('class');
                console.log(pClass)
                var thisDataColumn = (pClass == 'male-repub') ? 'male-repub' : 'female-dem';
                var otherDataColumn = (pClass == 'male-repub') ? 'female-dem' : 'male-repub';
                console.log(config['data'][i][thisDataColumn])
                console.log(config['data'][i][otherDataColumn])
                if (config['data'][i][thisDataColumn] < config['data'][i][otherDataColumn]) {
                    d3.select(this).classed('left', true);
                    return -8;
                } else {
                    d3.select(this).classed('right', true);
                    return 8;
                }
            })
            .text(function(d) {
                return d.toFixed(0) + '%';
            });
    });


    // render dot key labels

    _.each(['shadow', 'value'], function(cls) {
        var dotValues = chartElement.append('g')
            .attr('class', cls)
            .selectAll('g')
            .data(categories)
            .enter().append('g')
                .attr('class', function(d, i) {
                    return classify(d);
                });
        dotValues.selectAll('text.keyLabel')
            .data(function(d, i) {
                var dotData = _.pluck(config['data'], d);
                return dotData;
            })
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d);
            })
            .attr('y', function(d,i) {
                if (i < 2) {
                    var extraSpaceCurrent = 0 
                }
                else {
                    var extraSpaceCurrent = extraSpace
                }
                return i * (barHeight + barGap) + (barHeight / 2) + 3 + extraSpaceCurrent - 13;
            })
            .attr('dx', function(d,i) {
                var pClass = d3.select(this.parentNode).attr('class');
                console.log(pClass)
                var thisDataColumn = (pClass == 'male-repub') ? 'male-repub' : 'female-dem';
                var otherDataColumn = (pClass == 'male-repub') ? 'female-dem' : 'male-repub';
                console.log(config['data'][i][thisDataColumn])
                console.log(config['data'][i][otherDataColumn])
                if (config['data'][i][thisDataColumn] < config['data'][i][otherDataColumn]) {
                    d3.select(this).classed('left', true);
                    return -8;
                } else {
                    d3.select(this).classed('right', true);
                    return 8;
                }
            })
            .attr("class", "keyLabel") 
            .text(function(d, i) {
                var thisDataObj = config['data'][i]
                if (d == thisDataObj["male-repub"]) {
                    if (thisDataObj["type"] == "gender") {
                        return "Male"
                    }
                    else {
                        return "GOP"
                    }
                }
                else if (d == thisDataObj["female-dem"]) {
                    if (thisDataObj["type"] == "gender") {
                        return "Female"
                    }
                    else {
                        return "Dem."
                    }
                }
            })
            .attr("class", function(d, i) {
                var thisDataObj = config['data'][i]
                if (d == thisDataObj["male-repub"]) {
                    if (thisDataObj["type"] == "gender") {
                        return "keyLabel keyLabelMale"
                    }
                    else {
                        return "keyLabel keyLabelGOP"
                    }
                }
                else if (d == thisDataObj["female-dem"]) {
                    if (thisDataObj["type"] == "gender") {
                        return "keyLabel keyLabelFemale"
                    }
                    else {
                        return "keyLabel keyLabelDem"
                    }
                }
            });
    });




    /*
     * top dot labels
     */
    // categories.forEach(function(d,i) {
    //     var lblElement = chartElement.select('g.value .' + classify(d));
    //     lblElement.append('text')
    //         .text(d)
    //         .attr('class', 'hdr')
    //         .attr('x', xScale(config['data'][0][d]))
    //         .attr('dx', function(d,i) {
    //             if (d == minColumn) {
    //                 d3.select(this).classed('left', true);
    //                 return -8;
    //             } else {
    //                 d3.select(this).classed('right', true);
    //                 return 8;
    //             }
    //         })
    //         .attr('y', function(d,i) {
    //             return -15;
    //         })
    //         .call(wrapText, 80, 14);
    // })

    /*
     * Render bar labels.
     */
    containerElement
        .append('ul')
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
                if (i < 2) {
                    var extraSpaceCurrent = 0 
                }
                else {
                    var extraSpaceCurrent = extraSpace
                }
                return formatStyle({
                    'width': labelWidth + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap) + extraSpaceCurrent) + 'px;'
                });
            })
            .attr('class', function(d, i) {
                if (i%2 != 1) {
                    return classify(d[labelColumn]);
                }
                else {
                    return "display-none"
                }
            })
            .append('span')
                .html(function(d, i) {
                    if (i%2 != 1) {
                        return d['label_fmt'];
                    }
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
