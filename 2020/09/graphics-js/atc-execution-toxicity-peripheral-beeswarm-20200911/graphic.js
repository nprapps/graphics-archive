console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");

var {
    COLORS,
    classify,
    wrapText,
    makeTranslate
} = require("./lib/helpers");

var {
    isMobile
} = require("./lib/breakpoints");

var d3 = {
    ...require("d3-array/dist/d3-array.min"),
    ...require("d3-axis/dist/d3-axis.min"),
    ...require("d3-scale/dist/d3-scale.min"),
    ...require("d3-selection/dist/d3-selection.min"),
    ...require("d3-force/dist/d3-force.min"),
    ...require("d3-voronoi/dist/d3-voronoi.min"),
};

var pymChild = null;
pym.then(function(child) {
    pymChild = child;
    child.sendHeight();
    window.addEventListener("resize", render);


    var render = function() {
        var containerElement = document.querySelector(".graphic");
        //remove fallback
        containerElement.innerHTML = "";
        var containerWidth = containerElement.offsetWidth;

        var container = d3.select(containerElement);

        //run your D3 functions here
        // formatData(DATA);
        renderBeeswarm(container, containerWidth);


        pymChild.sendHeight();

        window.setTimeout(() => pymChild.sendHeight(), 2000)
    };

    render();
      window.addEventListener("resize", render);


});

var renderBeeswarm = function(container, containerWidth) {

    var margins = {
        top: 0,
        right: 40,
        bottom: 40,
        left: 25
    };

    var ticksX = 20;
    var roundTicksFactor = 20;

    if (isMobile.matches) {
        ticksX = 10;
    }

    var aspectWidth = isMobile.matches ? 4 : 16;
    var aspectHeight = isMobile.matches ? 2 : 4;

    var width = containerWidth - margins.left - margins.right;
    var height =
        Math.ceil((containerWidth * aspectHeight) / aspectWidth) -
        margins.top -
        margins.bottom;

    var expected = 39.2;

    var data = DATA.filter(d => d.toxicity != "N/A");

    // create svg container
    var svg = container
        .append('svg')
        .attr("width", width + margins.left + margins.right)
        .attr("height", height + margins.top + margins.bottom)
        .append("g")
        .attr("transform", `translate(${margins.left},${margins.top})`);

    svg.attr("width", containerWidth)
        .attr("height", height)

    // var formatValue = d3.format(",d");

    // x scale
    var values = data.map(d => d.toxicity[data.length - 1]);
    var floors = values.map(
        v => Math.floor(v / roundTicksFactor) * roundTicksFactor
    );
    var ceilings = values.map(
        v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
    );

    var min = Math.min(...floors);

    if (min > 0) {
        min = 0;
    }

    var x = d3
        .scaleLinear()
        .range([0, width]);

    // var g = svg

    x.domain([0, 65]);

    console.log(d3.max(data, function(d) {
            return d.toxicity;
        }))

    var simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(function(d) {
            return x(d.toxicity);
        }).strength(1))
        .force("y", d3.forceY(height / 2))
        .force("collide", d3.forceCollide(4))
        .stop();

    for (var i = 0; i < 120; ++i) simulation.tick();

    // x axis
    var xAxis = d3
        .axisBottom()
        .scale(x)
        .ticks(ticksX)
        .tickFormat((d, i)=> i == 0 ? d + "µg/mL": d);


    svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", makeTranslate(0, height))
        .call(xAxis);

    // x axis grid
    var xAxisGrid = function() {
        return xAxis;
    };

    svg.append("g")
        .attr("class", "x grid")
        .attr("transform", makeTranslate(0, height))
        .call(
            xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat("")
        );

    var cell = svg.append("g")
        .attr("class", "cells")
        .selectAll("g").data(d3.voronoi()
            .extent([
                [-margins.left, -margins.top],
                [width + margins.right, height + margins.top]
            ])
            .x(function(d) {
                return d.x;
            })
            .y(function(d) {
                return d.y;
            })
            .polygons(data)).enter().append("g");

    cell.append("circle")
        .attr("r", 3)
        .attr("cx", function(d) {
            return d.data.x;
        })
        .attr("cy", function(d) {
            return d.data.y;
        })
        .attr("class", function(d) {
            if (d.data.toxicity < 5) {
                return "low-end";
            } else if (d.data.toxicity > 38.9) {
                return "high-end";
            }

            return "in-between";
        });

    cell.append("path")
        .attr("d", function(d) {
            return "M" + d.join("L") + "Z";
        });

    function type(d) {
        if (!d.toxicity) return;
        d.toxicity = +d.toxicity;
        return d;
    }


    // add in annotation


    var annotContainer = svg.append("g")
        .attr('class', 'anotations')

    annotContainer.append("line")
        .attr('x1', x(expected))
        .attr('x2', x(expected))
        .attr("y1", 0)
        .attr("y2", height)
        .attr('class', 'expected-line')

    annotContainer.append('text')
        .attr('class', 'lung-normal-annot')
        .classed('expected-label', true)
        .attr('x', x(expected) + 5)
        .attr('y', 10)
        .text("38.9: Level expected by anesthesiologists in surgery")
        .call(wrapText, isMobile.matches ? 130 : 250, 12)
        ;

}

