var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
  ...require("d3-timer/dist/d3-timer.min")
};

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  console.log('hello')
  console.log(config)
  // d3.select()

  var containerElement = d3.select(config.container).select("svg");

  var polyline = containerElement.selectAll("polyline");
  
  console.log(polyline)

  console.log(config.data)
  
  var boats = containerElement.append("g");

  boats.selectAll("circle")
    .data(polyline._groups[0])
    .enter()
    .append("circle")
    .attr("class",d => d.classList[1])
    .attr("cy",d => d.points[0].y)
    .attr("cx",d => d.points[0].x)
    .attr("r",15)

  return boats;

};
