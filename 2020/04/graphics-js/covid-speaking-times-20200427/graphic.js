var { isMobile } = require("./lib/breakpoints");
var { classify } = require("./lib/helpers");
var pym = require("./lib/pym");
require("./lib/webfonts");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min")
};

// Global vars
var pymChild = null;

var renderColumnChart = require("./renderColumnChart");

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = formatData(window.DATA);
  var data_averages = formatData(window.DATA_AVG);
  render({ data, data_averages });

  window.addEventListener("resize", () => render({ data, data_averages }));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function(input) {
  var output = [];

  input.forEach(function(d) {
    var [ m, day, y ] = d.label.split("/").map(Number);
    d.label = new Date(y, m - 1, day);
    output.push(d);
  });

  return output;
};

// Render the graphic(s)
var render = function({ data, data_averages }) {
  var charts = Object.keys(data[0]).slice(1);

  // Render the chart!
  var container = "#column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(container);
  containerElement.html("");

  var gutterWidth = 22;
  var numCols = isMobile.matches ? 1 : 3;
  var graphicWidth = Math.floor((width - ((numCols - 1) * gutterWidth)) / numCols);

  charts.forEach(function(c, i) {
    containerElement.append("div")
      .attr("class", "chart " + classify(c))
      .attr("style", function() {
        if (numCols > 1) {
          var s = "";
          s += "width: " + graphicWidth + "px;";
          s += "float: left;"
          if (i > 0) {
            s += "margin-left: " + gutterWidth + "px;";
          }
          return s;
        }
      });

    renderColumnChart({
      container: container + " .chart." + classify(c),
      width: graphicWidth,
      data,
      data_averages,
      labelColumn: "label",
      valueColumn: c,
      title: c,
      yDomain: [ 0, 100 ]
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
window.onload = onWindowLoaded;
