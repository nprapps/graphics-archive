// Global vars
var pymChild = null;
var isMobile = false;
var isPromo = false;
var skipLabels = ['year', 'date', 'label', 'label_fmt', 'favor', 'race', 'unique', 'flip'];
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

    filteredDATA = [];

    DATA.forEach(function(el, ind) {
        if (el["old_margin"] <= 10000) {
            filteredDATA.push(el)
        }
    })

    // Render the chart!
    renderDotChart({
        container: '#dot-chart',
        width: containerWidth,
        data: filteredDATA
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

    var labelColumn = 'unique';
    var valueColumn = 'amt';
    var minColumn = categories[1];
    var maxColumn = categories[0];


    var barHeight = 25;
    var barGap = 15;
    var labelWidth = 150;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 6;

    var ticksX = 4;
    var roundTicksFactor = 5;
    var tickValues = [-1000, 0, 2000, 4000, 6000, 8000, 10000];

    var margins = {
        top: 20,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    if (isMobile) {
        //     barHeight = 25;
        //     barGap = 15;
        //     labelMargin = 10;
        //     labelWidth = 170;
        //     margins['left'] = (labelWidth + labelMargin);
        margins['right'] = 35;
        // margins['left'] = 15;
        ticksX = 3;
        tickValues = [-1000, 0, 5000, 10000];
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

    // add key first
    var key = containerElement
        .append("ul")
        .attr("class", "key")

    var keyData = [
        ["old_margin", "Original margin"],
        ["new_margin", "Margin after recount"]
    ]

    for (i = 0; i < keyData.length; i++) {
        key.append("li")
            .attr("class", "key-item")
            .html("<b class='" + keyData[i][0] + "'></b><label>" + keyData[i][1] + "</label>")
    }

    key.append("div")
        .attr('class', 'key-item bold-key')
        .html("<strong>Bold races flipped after recount</strong>")

    // --------------end key-------------

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
    var min = -1000;
    var max = 10000;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */

    var formatComma = d3.format(",")

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(tickValues)
        .tickFormat(function(d) {
            if (d > 0) {
                return formatComma(d);
            } else if (d == 0) {
                return "0";
            }
        });

    var xAxisTop = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .tickValues(tickValues)
        .tickFormat(function(d) {
            if (d > 0) {
                return formatComma(d);
            } else if (d == 0) {
                return "0";
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, 0))
        .call(xAxisTop);

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

    chartElement.append('line')
        .attr('class', 'zero-line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', 0)
        .attr('y2', chartHeight);

    /*
     * Render range bars to chart.
     */
    var hex = { 'blue': '#498dcb', 'red': '#f05b4e' };

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
                return 'url(#arrow-gray)';
            } else {
                return 'url(#arrow-gray)';
            }

        })
        .attr("stroke", "#ccc");



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
            // if (isMobile) {
            //     return dotRadius - 2;
            // }
            return dotRadius;
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
            .attr('class', function(d) {
                return classify(d);
            });
        dotValues.selectAll('text')
            .data(function(d, i) {
                console.log(d)
                var dotData = ""
                if (d == maxColumn) {
                    var dotData = _.pluck(config['data'], d);
                }

                return dotData;
            })
            .enter().append('text')
            .attr('x', function(d, i) {
                var pClass = d3.select(this.parentNode).attr('class'),
                    pClassVal = config['data'][i][classMapping[pClass]];

                if (pClassVal == Math.min(config['data'][i][maxColumn], config['data'][i][minColumn])) {
                    if (!isMobile) {
                        return xScale(d) - 10;
                    } else {
                        return xScale(d) + 15;
                    }
                } else {
                    return xScale(d) + 10;
                }
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2) + 3;
            })
            .attr("text-anchor", function(d, i) {
                var pClass = d3.select(this.parentNode).attr('class'),
                    pClassVal = config['data'][i][classMapping[pClass]];

                if (pClassVal == Math.min(config['data'][i][maxColumn], config['data'][i][minColumn])) {
                    if (!isMobile) {
                        return "end";

                    } else {
                        return "start"
                    }
                } else {
                    return "start";
                }
            })
            .attr("font-weight", function(d, i) {
                if (DATA[i]["flip"] == "flip") {
                    return "bold";
                }
                return "normal"
            })
            .attr("class", function(d, i) {
                if (DATA[i]["flip"] == "flip") {
                    return "flip-result";
                }
                return ""
            })
            .text(function(d, i) {
                // console.log(d,i)
                var marginDiff = DATA[i]["new_margin"] - DATA[i]["old_margin"];
                // var flip = false;
                // if (DATA[i]["flip"] == "flip") {
                //     flip = true;
                // }
                // console.log(flip)
                if (i == 0) {
                    var changeStr = formatComma(marginDiff).toString()
                    marginDiff = "Vote change: " + changeStr
                    return marginDiff
                } else {
                    return formatComma(marginDiff)

                }
            });
    });


    if (!isMobile) {
        console.log("text")
        chartElement.append("text")
            .attr("x", xScale(-1000))
            .attr("y", chartHeight + 17)
            .attr('class', "flip-axis-label")
            .attr("text-anchor", "middle")
            .text("-1,000")

        chartElement.append("text")
            .attr("x", xScale(-1000))
            .attr("y", -9)
            .attr('class', "flip-axis-label")
            .attr("text-anchor", "middle")
            .text("-1,000")
    }




    /*
     * top dot labels
     */
    // categories.forEach(function(d, i) {
    //     var lblElement = chartElement.select('g.value .' + classify(d));
    //     lblElement.append('text')
    //         .text(function(d) {
    //             if (d.indexOf("old") > -1) {
    //                 return "Orig. margin";
    //             } else {
    //                 return "New margin";
    //             }
    //         })
    //         .attr('class', 'hdr')
    //         .attr('x', xScale(config['data'][0][d]))
    //         .attr('dx', function(d, i) {
    //             if (d == minColumn) {
    //                 return -8;
    //             } else {
    //                 return 8;
    //             }
    //         })
    //         .attr('y', function(d, i) {
    //             if (d == maxColumn) {
    //                 return -2;
    //             } else {
    //                 return -14;
    //             }
    //         })
    //         .call(wrapText, 100, 13);

    // })

    /*
     * Render bar labels.
     */
    chartWrapper
        .append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': (margins['top']) + 'px',
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
        .append('div')
        .attr("class", function(d) {
            return d["flip"]
        })
        .html(function(d) {
            var text1 = "<div>" + d['label'] + "</div>";
            var text2 = "<div class='race-details-label'>" + d["year"] + ", " + d["race"] + "</div>";
            return text1 + text2;
        })
    // .insert('span')
    //     .attr("class", "race-details-label")
    //     .html(function(d) {
    //         var text = "<span class='race-details-label'>" + d["year"] + ", " + d["race"] + "</span>";
    //         return text;
    //     });




}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;