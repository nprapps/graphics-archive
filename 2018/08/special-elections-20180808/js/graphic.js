// Global vars
var pymChild = null;
var isMobile = false;
var isPromo = false;
var skipLabels = [ 'year', 'date','label', 'label_fmt' ];
var classMapping = {};

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
    var categories = d3.keys(config['data'][0]).filter(function(d) {
        if (!_.contains(skipLabels, d)) {
            return d;
        }
    });

    var labelColumn = 'label';
    var valueColumn = 'amt';
    var minColumn = categories[1];
    var maxColumn = categories[0];

    console.log(categories);

    var barHeight = 30;
    var barGap = 30;
    var labelWidth = 100;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 6;

    var ticksX = 4;
    var roundTicksFactor = 5;

    var margins = {
        top: 25,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    if (isMobile) {
        barHeight = 35;
        barGap = 35;
        labelMargin = 10;
        labelWidth = 80;
        margins['left'] = (labelWidth + labelMargin);
        margins['right'] = 25;
        ticksX = 6;
    }

    if (isPromo) {
        barHeight = 35;
        labelWidth = 100;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length) + 13; // 13 for top dot labels

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
    var min = (-10);
    var max = 40;

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
            if (d > 0) {
                return "R+" + d;
            } else if (d == 0) {
                return "0";
            }
            return "D+" + Math.abs(d);
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

    $('.grid .tick:nth-child(2) line').css({'stroke': '#666', 'stroke-width': '1.5px'});

    /*
     * Render range bars to chart.
     */
    var hex = {'blue': '#498dcb', 'red': '#f05b4e'};
    function marker(color) {
        chartElement.append("svg:defs").append("svg:marker")
        .attr("id", "arrow-" + color)
        .attr("refX", function() {
            if (isMobile) {
                return 4;
            }
            return 3;
        })
        .attr("refY", 3)
        .attr("viewBox", "0 0 13 13")
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,0 L0,6 L6,3 z")
        .attr("fill", hex[color]);
    };
    marker('blue');
    marker('red');

    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', function(d) {
                return xScale(d[maxColumn]);
            })
            .attr('x2', function(d) {
                if (d[minColumn] < d[maxColumn]) {
                    return xScale(d[minColumn] + 0.5);
                } else {
                    return xScale(d[minColumn] - 0.5);
                }
            })
            .attr('y1', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('y2', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('marker-end', function(d) {
                if (d[minColumn] < d[maxColumn]) {
                    return 'url(#arrow-blue)';
                } else {
                    return 'url(#arrow-red)';
                }

            })
            .attr("stroke", function(d) {
                if (d[minColumn] < d[maxColumn]) {
                    return "#498dcb";
                } else {
                    return "#f05b4e";
                }
            });



    /*
     * Render dots to chart.
     */
    var dots = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('g')
        .data(categories)
        .enter().append('g')
            .attr('class', function(d) {
                classMapping[classify(d)] = d;
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
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('r', function(d) {
                if (isMobile) {
                    return dotRadius - 2;
                }
                return dotRadius;
            });

    chartElement.select('.margin-2016')
        .selectAll('circle')
        .style({'fill': COLORS['red5'], 'stroke': '#fff', 'stroke-width': '1px'});

    chartElement.select('.special-election-margin')
        .selectAll('circle')
        .style('fill', function(d) {
            return "none";
        });

    /*
     * Render dot values.
     */
     console.log(config['data']);
    _.each(['shadow', 'value'], function(cls) {
        var dotValues = chartElement.append('g')
            .attr('class', cls)
            .selectAll('g')
            .data(categories)
            .enter().append('g')
                .attr('class', function(d) {
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
                return i * (barHeight + barGap) + (barHeight / 2) + 3;
            })
            .attr('dx', function(d,i) {
                var pClass = d3.select(this.parentNode).attr('class'),
                    pClassVal = config['data'][i][classMapping[pClass]];

                var additional = (pClass == "special-election-margin") ? 5 : 0;

                if (pClassVal == Math.min(config['data'][i][maxColumn], config['data'][i][minColumn])) {
                    return -(10 - additional);
                } else {
                    return 10 - additional;
                }
            })
            .attr("text-anchor", function(d, i) {
                var pClass = d3.select(this.parentNode).attr('class'),
                    pClassVal = config['data'][i][classMapping[pClass]];

                if (pClassVal == Math.min(config['data'][i][maxColumn], config['data'][i][minColumn])) {
                    return "end";
                } else {
                    return "start";
                }
            })
            .text(function(d) {
                if (d.toFixed(0) > 0) {
                    return "R+" + d.toFixed(0);
                }
                return "D+" + d.toFixed(0);
            });
    });

    /*
     * top dot labels
     */
    categories.forEach(function(d,i) {
        var lblElement = chartElement.select('g.value .' + classify(d));
        lblElement.append('text')
            .text(function(d) {
                if (d.indexOf("2016") > -1) {
                    return "2016 Margin";
                }
                return d;
            })
            .attr('class', 'hdr')
            .attr('x', xScale(config['data'][0][d]))
            .attr('dx', function(d,i) {
                if (d == minColumn) {
                    return -8;
                } else {
                    return 8;
                }
            })
            .attr('y', function(d,i) {
                if (d == maxColumn) {
                    return -2;
                } else {
                    return -14;
                }
            })
            .call(wrapText, 100, 13);

    })

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
                .html(function(d) {
                    var text = d['label'] + "<br><p>" + d['date'] + "<p>";
                    if (d['label'] == 'PA-18' || d['label'] == 'KS-4') {
                        text = "<span class='year' id='" + d['year'] + "'>" + d['year'] + "</span>" + text;
                    }
                    return text;
                });

    /*
    * Adding year dividing line
    */
    chartElement.append("line")
        .attr('class', 'year-line')
        .attr('x1', function() {
            return xScale(-labelWidth);
        })
        .attr('x2', function() {
            return xScale(-labelMargin);
        })
        .attr('y1', function() {
            return 4 * (barHeight + barGap) + (barHeight + barGap/2);
        })
        .attr('y2', function() {
            return 4 * (barHeight + barGap) + (barHeight + barGap/2);
        })
        .attr("fill", 'none')
        .attr("stroke", "#999")
        .attr("stroke-width", '1.5px')
        .attr("stroke-dasharray", "2,2");


    /*
     * Positioning year labels.
     */

    if (isMobile) {
        $('span.year').css({'transform': 'translate(-' + labelMargin*0.5 + 'px, -' + labelMargin*1.5 + 'px)'});
    } else {
        $('span.year').css({'transform': 'translate(-' + labelMargin*2 + 'px, 0)'});
    }



}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
