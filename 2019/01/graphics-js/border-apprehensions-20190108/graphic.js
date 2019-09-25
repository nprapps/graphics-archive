console.clear()

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");


// Global vars
var pymChild = null;

var d3 = Object.assign({},
    require("d3-axis"),
    require("d3-scale"),
    require("d3-selection"),
    require('d3-format'),
    require('d3-array')
);

var { COLORS, makeTranslate, classify } = require("./lib/helpers");

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

// Initialize the graphic.
var onWindowLoaded = function() {
    render();

    pym.then(child => {
        pymChild = child;
        child.sendHeight();

        pymChild.onMessage("on-screen", function(bucket) {
            ANALYTICS.trackEvent("on-screen", bucket);
        });
        pymChild.onMessage("scroll-depth", function(data) {
            data = JSON.parse(data);
            ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
        });
    });
    window.addEventListener("resize", render);
};

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
    // Render the chart!
    var container = "#column-chart";
    var element = document.querySelector(container);
    var width = element.offsetWidth;
    renderColumnChart({
        container,
        width,
        data: DATA
    });

    changeMapColors();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};


var changeMapColors = function() {

    var baseColor = "#17807E"


    var colorScale = d3.scaleLinear()
        .domain([0, 1])
        .range(['#FFF', baseColor])







    var mapStartKey = {
        "rgb(255, 170, 222)": "San Diego",
        "rgb(255, 246, 160)": "El Centro",
        "rgb(35, 207, 0)": "Yuma",
        "rgb(42, 255, 183)": "Tucson",
        "rgb(196, 34, 34)": "El Paso",
        "rgb(0, 1, 56)": "Big Bend",
        "rgb(234, 214, 0)": "Del Rio",
        "rgb(192, 210, 255)": "Laredo",
        "rgb(0, 2, 148)": "Rio Grande",
    }

    var paths = d3.selectAll("path")
        .each(function() {
            var thisFill = mapStartKey[this.style.fill];
            if (thisFill != undefined) {
                d3.select(this).classed(classify(thisFill), true)
            }
        })

    var maxVal = d3.max(DATA, function(d) { return +d.amt })


    DATA.forEach(function(el, ind) {
        var pctCalc = el.amt / maxVal;
        d3.selectAll("." + classify(el.label)).style("fill", colorScale(pctCalc))
    })




    d3.select("#map-svg").attr("style", "display: block;")



    // change bar colors


    var css = document.createElement('style');
    css.type = 'text/css';

    var styles = '';


    DATA.forEach(function(el, ind) {
        var pctCalc = el.amt / maxVal;
        styles += ' .' + classify(el.label) + ' { color: ' + colorScale(pctCalc) + ';}';
    })



    if (css.styleSheet) css.styleSheet.cssText = styles;
    else css.appendChild(document.createTextNode(styles));

    document.getElementsByTagName("head")[0].appendChild(css);






}

// Render a column chart.
var renderColumnChart = function(config) {



    var formatComma = d3.format(","),
        formatDecimal = d3.format(".1f"),
        formatDecimalComma = d3.format(",.2f"),
        formatSuffix = d3.format("s"),
        formatSuffixDecimal1 = d3.format(".1s"),
        formatSuffixDecimal2 = d3.format(".2s"),
        formatPercent = d3.format(",.2%");



    // Setup chart container
    var labelColumn = "label";
    var valueColumn = "amt";

    var aspectWidth = isMobile.matches ? 4 : 16;
    var aspectHeight = isMobile.matches ? 2 : 5;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 50
    };

    var ticksY = 4;
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config.width - margins.left - margins.right;
    var chartHeight =
        Math.ceil((config.width * aspectHeight) / aspectWidth) -
        margins.top -
        margins.bottom;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config.container);
    containerElement.html("");

    // Create the root SVG element.
    var chartWrapper = containerElement
        .append("div")
        .attr("class", "graphic-wrapper");

    var chartElement = chartWrapper
        .append("svg")
        .attr("width", chartWidth + margins.left + margins.right)
        .attr("height", chartHeight + margins.top + margins.bottom)
        .append("g")
        .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

    // Create D3 scale objects.
    var xScale = d3
        .scaleBand()
        .range([0, chartWidth])
        .round(true)
        .padding(0.1)
        .domain(
            config.data.map(function(d) {
                return d[labelColumn];
            })
        );

    var floors = config.data.map(
        d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
    );

    var min = Math.min(...floors);

    if (min > 0) {
        min = 0;
    }

    var ceilings = config.data.map(
        d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
    );

    var max = Math.max(...ceilings);

    var yScale = d3
        .scaleLinear()
        .domain([min, max])
        .range([chartHeight, 0]);

    // Create D3 axes.
    var xAxis = d3
        .axisBottom()
        .scale(xScale)
        .tickFormat(function(d, i) {
            return d;
        });

    var yAxis = d3
        .axisLeft()
        .scale(yScale)
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
        });

    // Render axes to chart.

    if (!isMobile.matches) {
        chartElement
            .append("g")
            .attr("class", "x axis")
            .attr("transform", makeTranslate(0, chartHeight))
            .call(xAxis);
    }


    chartElement
        .append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // Render grid to chart.
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement
        .append("g")
        .attr("class", "y grid")
        .call(
            yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat("")
        );

    // Render bars to chart.
    chartElement
        .append("g")
        .attr("class", "bars")
        .selectAll("rect")
        .data(config.data)
        .enter()
        .append("rect")
        .attr("x", function(d) {
            return xScale(d[labelColumn]);
        })
        .attr("y", function(d) {
            if (d[valueColumn] < 0) {
                return yScale(0);
            }

            return yScale(d[valueColumn]);
        })
        .attr("width", xScale.bandwidth())
        .attr("height", function(d) {
            if (d[valueColumn] < 0) {
                return yScale(d[valueColumn]) - yScale(0);
            }

            return yScale(0) - yScale(d[valueColumn]);
        })
        .attr("class", function(d) {
            return "bar " + classify(d[labelColumn]);
        });

    // Render 0 value line.
    if (min < 0) {
        chartElement
            .append("line")
            .attr("class", "zero-line")
            .attr("x1", 0)
            .attr("x2", chartWidth)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0));
    }

    // Render bar values.
    chartElement
        .append("g")
        .attr("class", "value")
        .selectAll("text")
        .data(config.data)
        .enter()
        .append("text")
        .text(function(d) {
            if (isMobile.matches) {
                return (d[valueColumn] / 1000).toFixed(0) + "K"
            } else {
                return formatComma(d[valueColumn].toFixed(0));
            }
        })
        .attr("x", function(d, i) {
            return xScale(d[labelColumn]) + xScale.bandwidth() / 2;
        })
        .attr("y", function(d) {
            return yScale(d[valueColumn]);
        })
        .attr("dy", function(d) {
            var textHeight = d3
                .select(this)
                .node()
                .getBBox().height;
            var barHeight = 0;

            if (d[valueColumn] < 0) {
                barHeight = yScale(d[valueColumn]) - yScale(0);

                if (textHeight + valueGap * 2 < barHeight) {
                    d3.select(this).classed("in", true);
                    return -(textHeight - valueGap / 2);
                } else {
                    d3.select(this).classed("out", true);
                    return textHeight + valueGap;
                }
            } else {
                barHeight = yScale(0) - yScale(d[valueColumn]);

                if (d.amt == d3.max(DATA, function(d) { return +d.amt })) {
                    d3.select(this).classed("in", true);
                    return textHeight + valueGap;
                } else {
                    d3.select(this).classed("out", true);
                    return -(textHeight - valueGap / 2);
                }
            }
        })
        .attr("text-anchor", "middle");



    // add label below


    chartWrapper.append("div")
        .attr("class", "west-east-text")
        .text("From West to East")
};

//Initially load the graphic
window.onload = onWindowLoaded;