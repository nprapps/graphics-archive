console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { fmtComma } = require("./lib/helpers");
var debounce  = require("./lib/debounce");

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


  var render = function() {
    console.log('render')
    var containerElement = document.querySelector(".graphic");
    //remove fallback
    containerElement.innerHTML = "";
    var containerWidth = containerElement.offsetWidth;

    var container = d3.select(containerElement);

    //run your D3 functions here

    renderBeeswarm(container, containerWidth, 'left');

    var containerElement = document.querySelector(".graphicright");
    //remove fallback
    containerElement.innerHTML = "";

    var container = d3.select(containerElement);

    //run your D3 functions here

    renderBeeswarm(container, containerWidth, 'right');


    pymChild.sendHeight();
  };

  render();
  window.addEventListener("resize", render);


});

var renderBeeswarm = function(container, containerWidth, side) {

  var svg = container.append('svg'),
      margin = {top: 20, right: 40, bottom: 40, left: 20},
      width = containerWidth,
      height = 290,
      chartWidth = width - margin.left - margin.right;

  if (isMobile.matches) {
    console.log('mobile')
    height = 330
  }

  var chartHeight = height - margin.top - margin.bottom;


  var expected = 400;
  if (side == 'right') {
    expected = 450;
  }
  var expectedMOE = 50;

  svg.attr("width", width)
    .attr("height", height)

  // var formatValue = d3.format(",d");

  var x = d3.scaleLinear()
      .range([0, chartWidth]);

  var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var data = DATA.filter(x=>x[side + "_amt"] != "N/A");

    x.domain([0, 1800]);

    var simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(function(d) { return x(d[side + "_amt"]); })
        .strength(3))
        .force("y", d3.forceY(chartHeight / 2))
        .force("collide", d3.forceCollide(6))
        .stop();


    for (var i = 0; i < 120; ++i) simulation.tick();


  // add in bkgrd shading

    g.append("rect")
    .attr('x', x(expected) - x(expectedMOE))
    .attr('width', x(expectedMOE) * 2)
    .attr("y", 0)
    .attr("height", chartHeight)
    .attr('class', 'expected-shade')

    var xTicks = 10;
    if (isMobile.matches) {
      xTicks = 5;
    }

    var xAxis = d3.axisBottom(x)
                .ticks(xTicks)
                .tickFormat(d=>fmtComma(d) + " g")

    g.append("g")
        .attr("class", "axis axis--x x-axis")
        .attr("transform", "translate(0," + chartHeight + ")")
        .call(xAxis);


    var cell = g.append("g")
        .attr("class", "cells")
      .selectAll("g").data(d3.voronoi()
          .extent([[-margin.left, -margin.top], [chartWidth, chartHeight]])
          .x(function(d) { return d.x; })
          .y(function(d) { return d.y; })
        .polygons(data)).enter().append("g");


    cell.append("circle")
        .attr("r", 5)
        .attr("cx", function(d) { return d.data.x; })
        .attr("cy", function(d) { return d.data.y; })
        .attr("data-val", d=> d.data.x);

    // cell.append("path")
    //     .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

    // cell.append("title")
        // .text(function(d) { return d.data.id + "\n" + d.data[side + "_amt"]; });

  function type(d) {
    if (!d[side + "_amt"]) return;
    d[side + "_amt"] = +d[side + "_amt"];
    return d;
  }


  // add in annotation


  var annotContainer = g.append("g")
    .attr('class', 'anotations')

  annotContainer.append("line")
    .attr('x1', x(expected))
    .attr('x2', x(expected))
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr('class', 'expected-line')

    annotContainer.append('text')
      .attr('x', x(expected))
      .attr('y', -4)
      .text("Normal range")
      .attr('class', 'lung-normal-annot')



}

