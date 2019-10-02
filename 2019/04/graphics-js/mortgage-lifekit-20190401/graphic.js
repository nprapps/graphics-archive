console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var { COLORS, classify, makeTranslate, fmtComma } = require("./lib/helpers");
var d3 = {
    ...require("d3-axis/dist/d3-axis.min"),
    ...require("d3-scale/dist/d3-scale.min"),
    ...require("d3-selection/dist/d3-selection.min"),
    ...require("d3-shape/dist/d3-shape.min"),
    ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();

//Initialize graphic
var onWindowLoaded = function() {
    formatData();

    render();

    window.addEventListener("resize", render);

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
};

//Format graphic data for processing by D3.
var formatData = function() {
    DATA.forEach(function(d) {
        // var [m, day, y] = d.date.split("/").map(Number);
        // y = y > 50 ? 1900 + y : 2000 + y;
        d.date = d.Mos;
    });

    function has30(text) {
        if (text.indexOf("30")) {
            return true
        } else {
            return false
        }

    }

    // has30(column)


    // Restructure tabular data for easier charting.
    for (var column in DATA[0]) {
        if (column == "Mos" || column == "date") continue;

        dataSeries.push({
            name: column,
            values: DATA.map(d => ({
                date: d.Mos,
                amt: d[column]
            }))
        });
    }
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
    // Render the chart!

    var years = ["15", "30"]

    for (i in years) {
        var container = "#line-chart-" + years[i];
        var element = document.querySelector(container);
        d3.select(element).html("");
        var width = element.offsetWidth;
        renderLineChart({
            container,
            width,
            data: dataSeries,
            "years": years[i]
        });
    }



    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

// Render a line chart.
var renderLineChart = function(config) {



    // Setup

    var newData = []

    for (ind in config.data) {
        newData.push(
            Object.assign({}, config.data[ind])
        )
    }




    newData = newData.filter(o => o.name.indexOf(config.years) > -1)

    var nameShift = {
        Equity_dollars_30: "Equity",
        Equity_dollars_15: "Equity",
        total_paid_15: "Total paid",
        total_paid_30: "Total paid"
    }

    for (ind in newData) {
        newData[ind].name = nameShift[newData[ind].name]
    }



    var dateColumn = "date";
    var valueColumn = "amt";

    var aspectWidth = isMobile.matches ? 4 : 16;
    var aspectHeight = isMobile.matches ? 3 : 12;

    var margins = {
        top: 5,
        right: 125,
        bottom: 20,
        left: 60
    };

    var ticksX = 10;
    var ticksY = 7;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile.matches) {
        // ticksX = 5;
        // ticksY = 5;
        // margins.right = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config.width - margins.left - margins.right;
    var chartHeight =
        Math.ceil((config.width * aspectHeight) / aspectWidth) -
        margins.top -
        margins.bottom;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config.container);

    containerElement.append("div")
        .attr("class", "chart-title")
        .html("<span>" + config.years + "-year</span> $200,000 mortgage")

    containerElement.append("div")
        .attr("class", "chart-title chart-subtitle")
        .html("Monthly payment: $" + { "30": "966", "15": "1,430" } [config.years])

    var dates = newData[0].values.map(d => d.date);

    for (ind in dates) {
        newData[0].values[ind].date = parseInt(newData[0].values[ind].date)
        newData[1].values[ind].date = parseInt(newData[0].values[ind].date)
        dates[ind] = parseInt(dates[ind])
    }

    var extent = [dates[0], dates[dates.length - 1]];

    var xScale = d3
        .scaleLinear()
        .domain(extent)
        .range([0, chartWidth]);


    var values = newData.reduce(
        (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
        []
    );

    var floors = values.map(
        v => Math.floor(v / roundTicksFactor) * roundTicksFactor
    );
    var min = Math.min.apply(null, floors);

    if (min > 0) {
        min = 0;
    }

    var ceilings = values.map(
        v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
    );
    var max = 200000;

    var yScale = d3
        .scaleLinear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3
        .scaleOrdinal()
        .domain(
            newData.map(function(d) {
                return d.name;
            })
        )
        .range([
            COLORS.teal3,
            COLORS.red3,
            COLORS.blue3,
            COLORS.orange3,
            COLORS.teal3
        ]);

    // Render the HTML legend.



    var legend = containerElement
        .append("ul")
        .attr("class", "key")
        .selectAll("g")
        .data(newData)
        .enter()
        .append("li")
        .attr("class", function(d) {
            return "key-item " + classify(d.name)
        });

    legend.append("b").style("background-color", d => colorScale(d.name));

    legend.append("label").text(d => d.name);

    // Create the root SVG element.

    var chartWrapper = containerElement
        .append("div")
        .attr("class", "graphic-wrapper");

    var chartElement = chartWrapper
        .append("svg")
        .attr("width", chartWidth + margins.left + margins.right)
        .attr("height", chartHeight + margins.top + margins.bottom)
        .append("g")
        .attr("transform", `translate(${margins.left},${margins.top})`);

    // Create D3 axes.

    var xAxis = d3
        .axisBottom()
        .scale(xScale)
        .tickValues([0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120])
        .tickFormat(function(d, i) {
            if (d == 120) {
                return d / 12 + " years"
            } else {
                return (d / 12)

            }
        });

    var yAxis = d3
        .axisLeft()
        .scale(yScale)
        .tickValues([0, 25000, 50000, 75000, 100000, 125000, 150000, 175000, 200000, 225000])
        .tickFormat(d => "$" + fmtComma(d));

    // Render axes to chart.

    chartElement
        .append("g")
        .attr("class", "x axis")
        .attr("transform", makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement
        .append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // Render grid to chart.

    var xAxisGrid = function() {
        return xAxis;
    };

    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement
        .append("g")
        .attr("class", "x grid")
        .attr("transform", makeTranslate(0, chartHeight))
        .call(
            xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat("")
        );

    chartElement
        .append("g")
        .attr("class", "y grid")
        .call(
            yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat("")
        );

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

    // Render lines to chart.
    var line = d3
        .line()
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement
        .append("g")
        .attr("class", "lines")
        .selectAll("path")
        .data(newData)
        .enter()
        .append("path")
        .attr("class", d => "line " + classify(d.name))
        .attr("stroke", d => colorScale(d.name))
        .attr("d", d => line(d.values));

    chartElement
        .append("g")
        .attr("class", "value")
        .selectAll("text")
        .data(newData)
        .enter()
        .append("text")
        .attr("class", d => classify(d.name))
        .attr("x", function(d, i) {
            var last = d.values[d.values.length - 1];

            return xScale(last[dateColumn]) + 5;
        })
        .attr("y", function(d) {
            var last = d.values[d.values.length - 1];

            return yScale(last[valueColumn]) + 3;
        })
        .text(function(d) {
            var last = d.values[d.values.length - 1];
            var value = last[valueColumn];

            var label = last[valueColumn].toFixed(1);

            label = d.name + ": $" + (parseFloat(label) / 1000).toFixed(0) + "K";

            return label;
        });


    // add in shading bw lines

    area = d3.area()
        .x(function(d, i) {
            return xScale(d['date'])
        })
        .y0(function(d, i) {
            return yScale(d["val1"])
        })
        .y1(function(d, i) {
            return yScale(d["val0"])
        })


    var pathDataFormatted = []

    for (ind in newData[0].values) {
        var d = {};
        d.date = parseInt(newData[0].values[ind].date)
        d.val0 = newData[0].values[ind].amt
        d.val1 = newData[1].values[ind].amt
        pathDataFormatted.push(d)


    }

    chartElement.append("path")
        .attr('class', "interest-shade")
        .datum(pathDataFormatted)
        .attr("d", area);

    // add interest label


    var lastPathData = pathDataFormatted[pathDataFormatted.length - 1]


    chartElement.select('.value')
        .append("text")
        .attr("class", 'interest')
        .attr("x", function() {
            return xScale(lastPathData["date"]) + 5;
        })
        .attr("y", function() {

            return yScale(lastPathData["val1"]) + ((yScale(lastPathData["val0"]) - yScale(lastPathData["val1"]))) / 2
        })
        .text(function() {
            var label = (lastPathData['val1'] - lastPathData['val0']).toFixed(1);

            label = "Interest paid: $" + (parseFloat(label) / 1000).toFixed(0) + "K";

            return label;
        });






};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;