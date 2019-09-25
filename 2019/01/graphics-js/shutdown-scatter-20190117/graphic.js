console.clear()

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

/*
 * Wrap a block of SVG text to a given width
 * adapted from http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = text.attr('dx') ? parseFloat(text.attr('dx')) : 0;
        var dy = text.attr('dy') ? parseFloat(text.attr('dy')) : 0;

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', (lineNumber * lineHeight) + dy + 'px')
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}



// Global vars
var pymChild = null;

var d3 = Object.assign({},
    require("d3-axis"),
    require("d3-scale"),
    require("d3-selection"),
    require('d3-transition'),
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
    var container = "#scatter-chart";
    var element = document.querySelector(container);
    var width = element.offsetWidth;
    renderScatter({
        container,
        width,
        element,
        data: DATA
    });


    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};


function renderScatter(config) {


    d3.select(config.container + " svg").html("");
    d3.selectAll(".tooltip").remove();
    d3.select(config.container + " select").html("<option>Select a state</option>");

    d3.select(".fallback").remove();

    config.data = config.data.filter(x => x.state != "District of Columbia")


    var margin = { top: 20, right: 28, bottom: 30, left: 70 },
        width = config.width - margin.right - margin.left,
        height = 500 - margin.top - margin.bottom;

    /* 
     * value accessor - returns the value to encode for a given data object.
     * scale - maps value to a visual display encoding, such as a pixel position.
     * map function - maps from data value to display value
     * axis - sets up axis
     */

    // setup x 
    var xValue = function(d) { return d.RPP2016; }, // data -> value
        xScale = d3.scaleLinear().range([0, width]), // value -> display
        xMap = function(d) { return xScale(xValue(d)); }, // data -> display
        xAxis = d3.axisBottom().scale(xScale);

    // setup y
    var yValue = function(d) { return d["average_salary"]; }, // data -> value
        yScale = d3.scaleLinear().range([height, 0]), // value -> display
        yMap = function(d) { return yScale(yValue(d)); }, // data -> display
        yAxis = d3.axisLeft().scale(yScale).tickFormat(function(d) { return "$" + d / 1000 + 'K' }).ticks(6);

    // add the graph canvas to the body of the webpage
    var svg = d3.select(config.container + " svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



    // gridlines in x axis function
    function make_x_gridlines() {
        return d3.axisBottom(xScale)
            .ticks(5)
    }

    // gridlines in y axis function
    function make_y_gridlines() {
        return d3.axisLeft(yScale)
            .ticks(5)
    }

    // add the tooltip area to the webpage
    var tooltip = d3.select(config.container).append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var ttx = 0;
    var tty = 40;

    // load data

    // change string (from CSV) into number format
    config.data.forEach(function(d) {
        d.RPP2016 = +d.RPP2016;
        d["average_salary"] = +d["average_salary"];
    });

    // don't want dots overlapping axis, so add in buffer to data domain
    xScale.domain([d3.min(config.data, xValue) - 1, d3.max(config.data, xValue) + 1]);
    yScale.domain([d3.min(config.data, yValue) - 1, d3.max(config.data, yValue) + 1]);



    // add the X gridlines
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(make_x_gridlines()
            .tickSize(-height)
            .tickFormat("")
        )

    // add the Y gridlines
    svg.append("g")
        .attr("class", "grid")
        .call(make_y_gridlines()
            .tickSize(-width)
            .tickFormat("")
        )


    // x-axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
    // .append("text")
    // .attr("class", "label")
    // .attr("x", width)
    // .attr("y", -6)
    // .style("text-anchor", "end")
    // .text("RPP2016");

    // y-axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
    // .append("text")
    // .attr("class", "label")
    // .attr("transform", "rotate(-90)")
    // .attr("y", 6)
    // .attr("dy", ".71em")
    // .style("text-anchor", "end")
    // .text("average_salary");

    // draw dots
    svg.selectAll(".dot")
        .data(config.data)
        .enter().append("circle")
        .attr('class', function(d) {
            return classify(d.state) + " dot"
        })
        // .attr("class", "dot")
        .attr("r", function(d) {
            return d.shutdown_per_1000_workers * 1.2
        })
        .attr("cx", xMap)
        .attr("cy", yMap)
        .on("mouseover", function(d) {

            d3.selectAll(".highlighted").classed("highlighted", false)
            d3.selectAll(".dot").classed("faded", true)
            d3.select(this).classed("highlighted", true)

            tooltip.transition()
                .duration(100)
                .style("opacity", 1);
            tooltip.html("<span class='tt-state'>" + d["state"] + "</span><br/>Average fed. salary: $" + fmtComma(d.average_salary) + "<br/>Fed. workers per thousand: " + parseFloat(d.shutdown_per_1000_workers).toFixed(2))
                .style("left", (d3.select(this).attr("cx") + ttx) + "px")
                .style("top", (d3.select(this).attr("cy") - tty) + "px");
        })
        .on("mouseout", function(d) {
            d3.selectAll(".dot").classed("faded", false)
            d3.select(this).classed("highlighted", false)

            tooltip.transition()
                .duration(100)
                .style("opacity", 0);
        });


    // add starter text labels

    var labelLineHeight = 15;
    var wrapTextWidth = 150;

    if (isMobile.matches) {
        wrapTextWidth = 100;
    }


    // maryland
    var marylandDatum = config.data.filter(x => x.state == "Maryland")[0]
    svg.append('text')
        .attr('x', xScale(marylandDatum.RPP2016) + 15)
        .attr('y', yScale(marylandDatum.average_salary) + 10)
        .attr("class", "state-name-label")
        .text("Maryland")

    svg.append('text')
        .attr('x', xScale(marylandDatum.RPP2016) + 15)
        .attr('y', yScale(marylandDatum.average_salary) + 10 + labelLineHeight)
        .attr("class", "state-note-label")
        .text("State with highest average salary: $" + fmtComma(marylandDatum.average_salary))
        .call(wrapText, wrapTextWidth, labelLineHeight - 1)




    // alaska
    var alaskaDatum = config.data.filter(x => x.state == "Alaska")[0]
    svg.append('text')
        .attr('x', xScale(alaskaDatum.RPP2016) + 20)
        .attr('y', yScale(alaskaDatum.average_salary) + 10)
        .attr("class", "state-name-label")
        .text("Alaska")

    svg.append('text')
        .attr('x', xScale(alaskaDatum.RPP2016) + 20)
        .attr('y', yScale(alaskaDatum.average_salary) + 10 + labelLineHeight)
        .attr("class", "state-note-label")
        .text("State with most federal workers affected per thousand: " + parseFloat(alaskaDatum.shutdown_per_1000_workers.toFixed(2)))
        .call(wrapText, wrapTextWidth, labelLineHeight - 1)





    // don't want dots overlapping axis, so add in buffer to data domain
    xScale.domain([d3.min(config.data, xValue) - 1, d3.max(config.data, xValue) + 1]);
    yScale.domain([d3.min(config.data, yValue) - 1, d3.max(config.data, yValue) + 1]);


    // add select options

    var selectSelector = "select.state-selector"

    config.data.forEach(function(el, ind) {
        d3.select(selectSelector)
            .append('option')
            .attr('value', el.state)
            .html(el.state)
    })



    // dropdown interaction

    d3.select(selectSelector)
        .on("change", function() {
            var selectValue = d3.select(selectSelector).property('value')
            d3.selectAll(".dot").classed("faded", true)
            d3.selectAll('.highlighted')
                .classed("highlighted", false)
            d3.select("." + classify(selectValue))
                .classed("highlighted", true)



            var thisDatum = config.data.filter(x => x.state == selectValue)[0]




            tooltip.transition()
                .duration(100)
                .style("opacity", 1);
            tooltip.html("<span class='tt-state'>" + thisDatum["state"] + "</span><br/>Average fed. salary: $" + fmtComma(thisDatum.average_salary) + "<br/>Fed. workers per thousand: " + parseFloat(thisDatum.shutdown_per_1000_workers).toFixed(2))
                .style("left", (d3.select("." + classify(selectValue)).attr("cx") + ttx) + "px")
                .style("top", (d3.select("." + classify(selectValue)).attr("cy") - tty) + "px");
        })


        // scoot x axis over

        d3.select(".x-label-container")
            .attr("style", "width: " + width + "px")



    // add in avg salary axis label
        svg.append('text')
        .attr('x', 0)
        .attr('y', yScale(107000))
        .attr('style', "text-anchor: end")
        .attr('class',"avg-salary-label")
        .text("Average salary")
        .call(wrapText, 40, 16);




}


//Initially load the graphic
window.onload = onWindowLoaded;