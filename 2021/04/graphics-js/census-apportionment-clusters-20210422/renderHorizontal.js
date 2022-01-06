var { isMobile } = require("./lib/breakpoints");
var { makeTranslate } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-force/dist/d3-force.min.js"),
  ...require("d3-selection/dist/d3-selection.js"),
  ...require("d3-transition/dist/d3-transition.js")
};
var { sqrt, PI } = Math;

module.exports = function(config) {
  // get only states with changes
  var currentData = config.data.filter(d => d.changed != 0);

  // map data to nodes
  var nodes = currentData.map(function(i) {
    var node = {};
      node.state = i.state;
      node.newPop = i.newPop;
      node.newEV = i.newEV;
      node.changed = i.changed;
      node.radius = 1 * i.newEV;
      return node;
  });

  // labels for axis
  var labels = [];

  currentData.forEach(function(d) {
    labels[d.changed] = d.changed
  })

  var numClusters = labels.length;
  var rangeWidth = 150;

  // chart dimensions
  var margins = {
    top: 5,
    right: 5,
    bottom: 10,
    left: 5
  };

  // var aspectWidth = isMobile.matches ? 4 : 16;
  // var aspectHeight = isMobile.matches ? 3 : 6;

  var votes = nodes.map(d => d.newEV);
  var minVotes = Math.min(...votes);
  var maxVotes = Math.max(...votes);

  var MIN_RADIUS = 12;
  var MAX_RADIUS = isMobile.matches ? 75 : 100;
  var MIN_TEXT = 10;
  var HIDE_TEXT = 6;

  // bound circle size
  var nodeRadius = function(d) {
    var a = d / maxVotes * (MAX_RADIUS**2);
    var r = Math.sqrt(a / PI);

    return Math.max(r, MIN_RADIUS);
  }

  var svg = document.querySelector(".graphic svg");
  var chart = document.querySelector("#svg-cont");

  svg.innerHTML = "";

  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = chartWidth / 3;
  // var chartHeight =
  //   Math.ceil((config.width * aspectHeight) / aspectWidth) -
  //   margins.top -
  //   margins.bottom;

  svg.setAttribute("width", chartWidth);
  svg.setAttribute("height", chartHeight);

  // create axis + anchor point for each cluster
  var clusters = d3.scalePoint()
    .domain(["-1", "1", "2"])
    .range([rangeWidth, chartWidth - rangeWidth])

  var axis = d3.axisTop(clusters)
    .ticks(numClusters)
    .tickFormat(function(d) {
      if (d == -1) {
        return d + " vote";
      } else if (d == 1) {
        return "+" + d + " vote";
      } else if (d == 2) {
        return "+" + d + " votes";
      }
      return d + " votes";
    });

  var gAxis = d3.select(svg)
    .append("g")
    // .attr("transform", makeTranslate(0, chartHeight / 4))
    .attr("class", "x axis axis--x")
    .call(axis);

  gAxis
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(axis.tickSize(chartHeight, 0, 0).tickFormat(""));

  // zero label
  gAxis
    .append("g")
    .attr("class", "zero-label")
    .append("line")
    .attr("x1", chartWidth / 3)
    .attr("y1", 0)
    .attr("x2", chartWidth / 3)
    .attr("y2", chartHeight)
    .attr("stroke-width", 2)
    .style("stroke-dasharray", (3,3));

  //set up force simulation; center force on left side
  var simulation = d3.forceSimulation()
    .force("charge", d3.forceManyBody())
    .force("collision", d3.forceCollide().radius(d => nodeRadius(d.radius) + 2))
    .force("center", d3.forceCenter(chartWidth / 3, chartHeight / 2 + 3));

  // draw circles
  var node = d3.select(svg)
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", d => nodeRadius(d.radius))
    .attr("class", function(d) {
      if (d.changed > 0) {
        return "state-circle gained";
      }

      if (d.changed < 0) {
        return "state-circle lost";
      }

      return "state-circle";
    })
    .attr("data-state", d => d.state);

  // draw state labels
  var stateLabels = d3.select(svg)
    .append("g")
    .attr("class", "state-labels")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("font-size", d => Math.max(nodeRadius(d.radius)/9*5, MIN_TEXT) + "px")
    .attr("display", d => nodeRadius(d.radius)/2 < HIDE_TEXT ? "none" : "block")
    .attr("class", "state-label")
    .text(d => d.state);

  simulation.nodes(nodes).on("tick", ticked);

  function ticked() {
    var k = this.alpha() * 0.3;
	 //move the nodes to their foci/cluster
		nodes.forEach(function(n, i) {
		    n.x += (clusters(n.changed) - n.x) * k;
				n.y += (0 - n.y) * k;
			});
		//update coordinates for the circle
		node
			.attr("cx", d => d.x)
			.attr("cy", d => d.y);

    //update coordinates for the labels
    stateLabels
      .attr("x", d => d.x)
      .attr("y", d => d.y + (nodeRadius(d.radius)/2 * .35))
  }

  //tooltips
  var tooltip = document.querySelector(".bubble-tooltip");

  var onMove = function(e) {
    var bounds = chart.getBoundingClientRect();
    var offsetX = e.clientX - bounds.left;
    var offsetY = e.clientY - 105;

    var state = e.target.getAttribute("data-state");
    var data = currentData.filter(d => d.state == state)[0];

    if (!state || !data) {
      return tooltip.classList.remove("show");
    }

    var oldEV = data.oldEV.toFixed(0);
    var newEV = data.newEV.toFixed(0);
    var stateFull = data.state_full;

    // var votesBucket = e.target.getAttribute('data-bucket');
    // var mode = e.target.getAttribute('data-mode');

    tooltip.innerHTML = `
      <div class="tooltip-label"><h3>${stateFull}</h3></div>
      <div class="tooltip-label number">New electoral votes: <strong>${newEV}</strong></div>
      <div class="tooltip-label number">2010 electoral votes: ${oldEV}</div>`

    tooltip.classList.add("show");

    var left = offsetX < bounds.width / 2 ? event.pageX + 10 : event.pageX - 150;
    tooltip.style.left = left + "px";
    tooltip.style.top = offsetY + 20 + "px";
  }

  if (!isMobile.matches) {
    chart.addEventListener("mousemove", onMove);
  }
}
