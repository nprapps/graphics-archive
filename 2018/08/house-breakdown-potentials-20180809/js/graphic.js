// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values', 'label_val', 'Net seats Dem gained' ];
var netSeats = {};
var currentBreakdown = [194, 241];

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
* For HP version: click to go to article
*/
if ($('body').hasClass('hp')) {
    $('body').click(function() {
        window.top.location.href = "https://www.npr.org/2018/08/17/639030198/trump-predicts-red-wave-but-special-elections-show-democrats-poised-for-big-gain";
    })
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d, i) {
        var x0 = 0;

        d['values'] = [];


        for (var key in d) {
            if (_.contains(skipLabels, key)) {
                if (key == 'Net seats Dem gained') {
                    netSeats[i.toString()] = d[key];
                }
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];

            d['values'].push({
                'name': key,
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })

            x0 = x1;
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
    renderStackedBarChart({
        container: '#stacked-bar-chart',
        width: containerWidth,
        data: DATA.slice(0, 1),
        wrapperName: 'current'
    });

    renderStackedBarChart({
        container: '#stacked-bar-chart',
        width: containerWidth,
        data: DATA.slice(1),
        wrapperName: 'potentials'
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 40;
    var barGap = 50;
    var labelWidth = 200;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 0,
        bottom: 20,
        left: 0
    };

    var ticksX = 2;
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksX = 2;
        labelWidth = 200;
        barGap = 70;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length) - barHeight - barGap/2;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    if (config['wrapperName'] == 'current') {
        containerElement.html('');
    }

    /*
     * Create D3 scale objects.
     */
    var min = 0,
        max = 435;


    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);



    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ "#498dcb",  "#f05b4e" ]);

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorScale.domain())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
        });

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
        .orient('top')
        .tickValues([218])
        // .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

    /*
     * Render bars to chart.
     */
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d[labelColumn]);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }

                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .style('fill', function(d) {
                 return colorScale(d['name']);
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

    /*
    * Render grid to chart
    */
    var xAxisGrid = function() {
        return xAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, barHeight-barGap))
        .call(xAxisGrid()
            .tickSize(-chartHeight-barHeight, 0, 0)
            .tickFormat('')
        )
        .attr('stroke-dasharray', "2,4");




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
    var copy_data = [];
    config['data'].forEach(function(d) {
        copy_data.push(d);
    })

    if (config['wrapperName'] == 'potentials') {
        copy_data.unshift({'label': 'If every congressional district shifted political support by ...', 'label_val': 0});

        var netSeatsCounter = {0: 0, 1: 0};
        group.append('g')
            .attr('class', 'value-netseats')
            .selectAll('text')
            .data(function(d) {
                return d['values'];
            })
            .enter().append('text')
            .text(function(d, i) {
                netSeatsCounter[i] += 1;
                if (netSeats[netSeatsCounter[i]] > 0 && i == 0) {
                    return " Democrats gain " + netSeats[netSeatsCounter[i]] + " seats";
                } else if (netSeats[netSeatsCounter[i]] < 0 && i == 1) {
                     return " GOP gains " + Math.abs(netSeats[netSeatsCounter[i]]) + " seats";
                }
            })
            .attr('class', function(d) {
                    return classify(d['name']);
            })
            .attr('x', function(d) {
                return xScale(d['x1']);
            })
            .attr('dx', function(d) {
                var textWidth = this.getComputedTextLength();
                var barWidth = Math.abs(xScale(d['x1']) - xScale(d['x0']));

                if (d['x1'] < 0) {
                    return valueGap;
                }

                return -(valueGap + textWidth);
            })
            .attr('dy', (barHeight/2) + 13);
    }


    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(copy_data)
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                var top = (i * (barHeight + barGap)) - (barHeight + barGap/2),
                    width = null;

                if (isMobile) {
                    width = 290; 
                    top = (i * (barHeight + barGap)) - (barHeight + barGap/2 + 13);
                    width = 290;
                } else {
                    width = 700;
                }

                if (d[labelColumn] == 'Current Breakdown') {
                    top = -barHeight + barGap/2;
                    if (isMobile) {
                        top = -barHeight + barGap/2 - 10;
                    }
                }

                return formatStyle({
                    'width': width + 'px',
                    'height': barHeight + 'px',
                    'left': '5px',
                    'top': top + 'px;'
                });
            })
            .attr('class', function(d) {
                if (d['label_val'] != 0) {
                    return classify(d[labelColumn]);
                }
                return 'subsubhed';
            })
            .append('span')
                .html(function(d, i) {
                    if (d['label'] == 'Current Breakdown') {
                        return d[labelColumn];
                    } else {
                        var text = "";
                        if (i == 1) {
                            text = text + "... the "; 
                        } else if (i > 1) {
                            text = text + "... or a ";
                        }

                        if (d['label_val']) {
                            return text + d[labelColumn] + " <p class='" + classify(d[labelColumn]) + "'>(" + d['label_val'] + ")</p>";
                        }
                        return d[labelColumn];
                    }
                });

    /*
    * Render bar values.
    */
     group.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('text')
            .text(function(d) {
                return d['val'];
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d) {
                return xScale(d['x1']);
            })
            .attr('dx', function(d) {
                var textWidth = this.getComputedTextLength();
                var barWidth = Math.abs(xScale(d['x1']) - xScale(d['x0']));

                // Hide labels that don't fit
                if (textWidth + valueGap * 2 > barWidth) {
                    d3.select(this).classed('hidden', true)
                }

                if (d['x1'] < 0) {
                    return valueGap;
                }

                return -(valueGap + textWidth);
            })
            .attr('dy', function(d) {
                if (d['val'] != currentBreakdown[0] && d['val'] != currentBreakdown[1]) {
                    if((d['name'] == 'Dem.' && d['val'] > currentBreakdown[0]) || (d['name'] == 'GOP' && d['val'] > currentBreakdown[0])) {
                        return (barHeight/2) - 2;
                    }
                }
                return (barHeight / 2) + 4;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
