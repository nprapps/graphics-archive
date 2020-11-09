var pym = require("./lib/pym");
require("./lib/webfonts");
var { classify } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min")
};

var pymChild;
var renderBarChart = require("./renderBars");

// Initialize the graphic.
var initialize = function() {
  // (NB: Use window.load to ensure all images have loaded)
  window.onload = onWindowLoaded;
}

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = window.DATA;
  render(data);

  window.addEventListener("resize", () => render(data));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  var charts = data.map(o => o['state']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq

  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  var containerElement = d3.select(container);
  containerElement.html("");

  var graphicWidth = width;
  var gutterWidth = 11;
  var labelWidth = 120;
  if (!isMobile.matches) {
    graphicWidth = Math.floor((width - (gutterWidth * 2) - labelWidth) / 3);
  }

  charts.forEach((chart, i) => {
    var chartData = data.filter(function(d) {
      return d.state == chart;
    });

    var thisLabelWidth = labelWidth;
    var thisGraphicWidth = graphicWidth;
    showLabels = true;
    if (!isMobile.matches && i == 0) {
      thisGraphicWidth = graphicWidth + labelWidth;
    } else if (!isMobile.matches && i > 0) {
      thisLabelWidth = 0;
      showLabels = false;
    }

    var chartElement = containerElement.append("div")
      .attr("class", "chart " + classify(chart));

    if (!isMobile.matches) {
      chartElement.attr("style", function() {
        var s = "";
        s += "float: left; ";
        if (i > 0) {
          s += "margin-left: " + gutterWidth + "px; "
        }
        return s;
      });
    }

    renderBarChart({
      container: ".chart." + classify(chart),
      width: thisGraphicWidth,
      data: chartData,
      labelColumn: "label",
      valueColumn: "amt",
      labelWidth: thisLabelWidth,
      showLabels,
      title: chart,
      xDomain: [ 0, 160000 ]
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

module.exports = initialize;
