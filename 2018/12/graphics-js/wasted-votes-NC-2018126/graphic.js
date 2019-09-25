console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");

var pymChild;
var skipLabels = ['Group', 'key', 'values'];

var d3 = {
    ...require("d3-axis"),
    ...require("d3-scale"),
    ...require("d3-selection")
};

var fmtComma = n => n.toLocaleString();

var { COLORS, classify, makeTranslate, formatStyle, getParameterByName } = require("./lib/helpers");

// Initialize the graphic.
var onWindowLoaded = function() {
    formatData();
    render();

    pym.then(child => {
        pymChild = child;
        pymChild.sendHeight();

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            data = JSON.parse(data);
            ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });

    });
}

// Format graphic data for processing by D3.
var formatData = function() {
    DATA.forEach(function(d) {
        d.key = d.Group;
        d.values = [];

        Object.keys(d).forEach(function(k) {
            var v = d[k];
            if (skipLabels.indexOf(k) > -1) {
                return;
            }

            d.values.push({ 'label': k, 'amt': +v });
            delete d[k];
        });

        delete d.Group;
    });
}

// Render the graphic(s). Called by pym with the container width.
var render = function() {

    // Render the chart!
    var container = "#grouped-bar-chart";
    var element = document.querySelector(container);
    var width = element.offsetWidth;
    renderGroupedBarChart({
        container,
        width,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

// Render a bar chart.
var renderGroupedBarChart = function(config) {

    var label_hed = LABELS.headline;

    var parentUrl = getParameterByName('parentUrl');

    console.log(parentUrl)

    if (parentUrl.indexOf("state") > -1) {
        var stateParam = getParameterByName('state', parentUrl);
    }
    else {
        var stateParam = getParameterByName('state');
    }



    config.data = config.data.filter(function(dist) {
        return dist.key.substring(0, 2) == stateParam;
    })

    // add state to the headline 

    var stateAbbrvs = { "OH": "Ohio", "NC": "North&nbsp;Carolina", "IA": "Iowa", "WI": "Wisconsin", "MI": "Michigan" }
    d3.select("h1").html(label_hed + " " + stateAbbrvs[stateParam]);


    // add footnote

    var footLabel = LABELS["footnote_" + stateParam]


    if (footLabel == undefined) {
        d3.select(".footnotes")
            .remove()
    } else {
        d3.select(".footnotes")
            .html("<p><b>Notes: </b>" + footLabel + "</p>")
    }

    var isMobile = true;

    if (window.innerWidth > 550) {
        isMobile = false;
    }

    var partyColors = { "GOP votes": COLORS.red2, "Dem. votes": COLORS.blue2, "GOP votes (wasted)": COLORS.red5, "Dem. votes (wasted)": COLORS.blue5 }

    // Setup chart container.
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var numGroups = config.data.length;
    var numGroupBars = config.data[0].values.length;

    var barHeight = 12;
    var barGapInner = 1;
    var barGap = 10;
    var groupHeight = (barHeight * numGroupBars) + (barGapInner * (numGroupBars - 1))
    var labelWidth = 73;
    var labelMargin = 6;
    var valueGap = 6;

    config.data.forEach(function(d) {
        vals = d.values;

        var wasteVotes = {}


        if (vals[0]['winner'] == true) {
            wasteVotes[vals[0].label] = vals[0].amt - vals[0].otherAmt - 1
            wasteVotes[vals[1].label] = vals[1].amt
        } else if (vals[0]['winner'] == false) {
            wasteVotes[vals[1].label] = vals[1].amt - vals[1].otherAmt - 1
            wasteVotes[vals[0].label] = vals[0].amt
        }

        var wasteMoreStr = ""

        if (wasteVotes["Dem. votes"] > wasteVotes["GOP votes"]) {
            wasteMoreStr = ((wasteVotes["Dem. votes"] - wasteVotes["GOP votes"]) / 1000).toFixed(0) + "K Dem."
        } else if (wasteVotes["Dem. votes"] < wasteVotes["GOP votes"]) {
            wasteMoreStr = ((wasteVotes["GOP votes"] - wasteVotes["Dem. votes"]) / 1000).toFixed(0) + "K GOP"
        }


        d.wasteMoreStr = wasteMoreStr;
    })

    if (isMobile) {
        labelWidth = 80;
    }


    var margins = {
        top: 20,
        right: config.width * .25,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    if (isMobile) {
        margins.right = 140;
        // margins.top = 0;
    }

    var ticksX = 7;
    if (isMobile) {
        ticksX = 4;
    }
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config.width - margins.left - margins.right;
    var chartHeight = (((((barHeight + barGapInner) * numGroupBars) - barGapInner) + barGap) * numGroups) - barGap + barGapInner;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config.container);
    containerElement.html('');

    // Create D3 scale objects.
    var values = config.data.reduce((acc, d) => acc.concat(d.values), []).map(d => d[valueColumn]);
    var ceilings = values.map(v => Math.ceil(v / roundTicksFactor) * roundTicksFactor);
    var floors = values.map(v => Math.floor(v / roundTicksFactor) * roundTicksFactor);
    var min = Math.min(...floors);
    var max = Math.max(...ceilings);

    if (min > 0) {
        min = 0;
    }

    var xScale = d3.scaleLinear()
        .domain([min, max])
        .range([0, chartWidth]);

    var yScale = d3.scaleLinear()
        .range([chartHeight, 0]);

    var colorScale = d3.scaleOrdinal()
        .domain(Object.keys(config.data[0].values).filter(d => skipLabels.indexOf(d) == -1))
        .range([COLORS.blue6, COLORS.red6]);


    // set up legend containers and contents in a loops

    for (i = 0; i < 2; i++) {
        var legendContainer = containerElement.append("div")
            .attr("class", "legend-container legend-container-" + i)


        // Render a color legend.
        var legend = legendContainer.append('ul')
            .attr('class', 'key')
            .selectAll('g')
            .data(["Dem. votes", "GOP votes", "Dem. votes (wasted)", "GOP votes (wasted)"].slice(i * 2, (i * 2 + 2)))
            .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d);
            });


        legend.append('b')
            .style('background-color', d => partyColors[d]);

        d3.select(".legend-container-" + i + " ul").append('label')
            .text(["Votes needed to win", '"Wasted" votes'][i])
    }


    // // Render a color legend.
    // var legend = containerElement.append('ul')
    //     .attr('class', 'key')
    //     .selectAll('g')
    //     .data(["Dem. votes", "Dem. votes (wasted)", "GOP votes", "GOP votes (wasted)"])
    //     .enter().append('li')
    //     .attr('class', function(d, i) {
    //         return 'key-item key-' + i + ' ' + classify(d);
    //     });

    // // legend.append('b')
    // //     .style('background-color', d => colorScale(d[labelColumn]));

    // legend.append('b')
    //     .style('background-color', d => partyColors[d]);

    // legend.append('label')
    //     .text(d => d);


    // Create the root SVG element.
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins.left + margins.right)
        .attr('height', chartHeight + margins.top + margins.bottom)
        .append('g')
        .attr('transform', `translate(${margins.left},${margins.top})`);

    // Create D3 axes.
    var xAxis = d3.axisBottom()
        .scale(xScale)
        .ticks(ticksX)
        .tickFormat(d => (d / 1000).toFixed(0) + "K");

    // Render axes to chart.
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    // Render grid to chart.
    var xAxisGrid = () => xAxis;

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    // Render bars to chart.
    var barGroups = chartElement.selectAll('.bars')
        .data(config.data)
        .enter()
        .append('g')
        .attr('class', 'g bars')
        .attr('transform', (d, i) => makeTranslate(0, i ? (groupHeight + barGap) * i : 0));

    barGroups.selectAll('rect')
        .data(d => d.values)
        .enter()
        .append('rect')
        .attr('x', function(d) {
            return d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn])
        })
        .attr('y', (d, i) => i ? (barHeight * i) + (barGapInner * i) : 0)
        .attr('width', d => Math.abs(xScale(0) - xScale(d[valueColumn])))
        .attr('height', barHeight)
        .style('fill', d => colorScale(d[labelColumn]))
        .attr('class', d => 'y-' + d[labelColumn]);

    barGroups.selectAll('rect.highlight-bars')
        .data(function(d) {
            if (d.values[0].amt > d.values[1].amt) {
                d.values[0]["winner"] = true
                d.values[1]["winner"] = false
            } else {
                d.values[0]["winner"] = false
                d.values[1]["winner"] = true
            }
            d.values[0]["otherAmt"] = d.values[1].amt
            d.values[1]["otherAmt"] = d.values[0].amt
            return d.values
        })
        .enter()
        .append('rect')
        .attr('x', function(d, i) {
            return d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn])
        })
        .attr('y', (d, i) => i ? (barHeight * i) + (barGapInner * i) : 0)
        .attr('width', function(d) {
            if (d.winner == true) {
                return Math.abs(xScale(0) - xScale(d["otherAmt"]))
            } else {
                return 0
            }
        })
        .attr('height', barHeight)
        .style('fill', function(d, i) {
            if (d.winner == true) {
                return partyColors[d.label]
            } else {
                return "white"
            }
        })
        .attr('class', d => 'y-' + d[labelColumn]);

    // Render 0-line.
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

    // Render bar labels.
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins.top + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config.data)
        .enter()
        .append('li')
        .attr('style', function(d, i) {
            var top = (groupHeight + barGap) * i;

            if (i == 0) {
                top = 0;
            }

            return formatStyle({
                'width': (labelWidth - 10) + 'px',
                'height': barHeight + 'px',
                'left': '0px',
                'top': top + 'px;'
            });
        })
        .attr('class', d => classify(d.key))
        .append('div')
        .text(d => d.key.slice(3, ))
        .attr('class', "dist-labels");

    // add in wasted votes counts

    var wastedX = chartWidth + margins.left;

    // if (!isMobile) {


    chartElement.append("text")
        .text(LABELS["bar_labels"])
        .attr("x", 0)
        .attr("style", "text-anchor: left;")
        .attr('y', -10)
        .attr('class', "cast-label-hed label-hed");

    d3.select("svg").append("text")
        .text(LABELS["wasted_labels"])
        .attr("x", wastedX + margins.left)
        .attr("style", "text-anchor: middle;")
        .attr('y', 10)
        .attr('class', "wasted-label-hed label-hed");

    chartElement.selectAll('text.wasted-label')
        .data(config.data)
        .enter()
        .append('text')
        .attr('class', function(d) {
            if (d.wasteMoreStr.indexOf("Dem") > 1) {
                return "wasted-label Dem-wasted-label"
            } else {
                return "wasted-label GOP-wasted-label"
            }
        })
        .attr('style', "text-anchor: middle;")
        .attr('x', wastedX)
        .attr('y', (d, i) => ((barHeight * 2 * (i + 1)) + (barGapInner * i)) + (barGap * i) - (barGap))
        .text(function(d) {
            return d.wasteMoreStr;
        })
    // } else {
    // config.data.forEach(function(d, i) {
    //     d3.select('li.' + classify(d.key))
    //         .append("div")
    //         .html(function() {
    //             if (i == 0) {
    //                 return "Net wasted votes: " + d.wasteMoreStr
    //             }
    //             else {
    //                return d.wasteMoreStr
    //             }

    //         })
    // })
    // }




    // function appendBarVals(all) {
    //     // Render bar values.
    //     barGroups.append('g')
    //         .attr('class', 'value')
    //         .selectAll('text')
    //         .data(d => d.values)
    //         .enter()
    //         .append('text')
    //         .text(function(d) {
    //             if (all == true) {
    //                 var v = d[valueColumn].toFixed(0);

    //                 if (d[valueColumn] > 0 && v == 0) {
    //                     v = '<1';
    //                 }

    //                 console.log(parseInt(v));
    //                 console.log(fmtComma(v));

    //                 return fmtComma(parseInt(v));
    //             } else {
    //                 if (d.winner == true) {
    //                     return fmtComma(d["otherAmt"] + 1);
    //                 } else {
    //                     return "";
    //                 }
    //             }
    //         })
    //         .attr('x', function(d) {
    //             if (all == true) {
    //                 return xScale(d[valueColumn])
    //             } else {
    //               console.log(d)
    //               return xScale(d["otherAmt"]);
    //             }
    //         })
    //         .attr("style", function(d) {
    //           if (all == false) {
    //             return "fill: white; text-anchor: end;"
    //           }
    //         })
    //         .attr('y', (d, i) => i ? (barHeight * i) + barGapInner : 0)
    //         .attr('dx', function(d) {
    //             var xStart = xScale(d[valueColumn]);
    //             var textWidth = this.getComputedTextLength()

    //             if (all == false) {
    //               return -10;
    //             }

    //             // Negative case
    //             if (d[valueColumn] < 0) {
    //                 var outsideOffset = -(valueGap + textWidth);

    //                 if (xStart + outsideOffset < 0) {
    //                     d3.select(this).classed('in', true)
    //                     return valueGap;
    //                 } else {
    //                     d3.select(this).classed('out', true)
    //                     return outsideOffset;
    //                 }
    //                 // Positive case
    //             } else {
    //                 if (xStart + valueGap + textWidth > chartWidth) {
    //                     d3.select(this).classed('in', true)
    //                     return -(valueGap + textWidth);
    //                 } else {
    //                     d3.select(this).classed('out', true)
    //                     return valueGap;
    //                 }
    //             }
    //         })
    //         .attr('dy', (barHeight / 2) + 4);
    // }

    // appendBarVals(true);
    // appendBarVals(false);





    // d3.select('.wasted-col')
    //     .selectAll("ul")
    //     .data(config.data)
    //     .enter()
    //     .append("li")
    //     .html(function(d) {
    //       vals = d.values;

    //       var wasteVotes = {}

    //       if (vals[0]['winner'] == true) {
    //         wasteVotes[vals[0].label] = vals[0].amt - vals[0].otherAmt - 1
    //         wasteVotes[vals[1].label] = vals[1].amt
    //       }
    //       else if (vals[0]['winner'] == false) {
    //         wasteVotes[vals[1].label] = vals[1].amt - vals[1].otherAmt - 1
    //         wasteVotes[vals[0].label] = vals[0].amt
    //       }

    //       var wasteMoreStr = ""

    //       if (wasteVotes["Dem. votes"] > wasteVotes["GOP votes"]) {
    //         wasteMoreStr = ((wasteVotes["Dem. votes"] - wasteVotes["GOP votes"])/1000).toFixed(0) + "K Dem."
    //       }
    //       else if (wasteVotes["Dem. votes"] < wasteVotes["GOP votes"]) {
    //         wasteMoreStr = ((wasteVotes["GOP. votes"] - wasteVotes["Dem votes"])/1000).toFixed(0) + "K GOP"
    //       }


    //       return wasteMoreStr;
    //     });




};






/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
window.addEventListener("resize", render);
