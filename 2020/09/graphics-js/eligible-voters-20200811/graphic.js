console.clear();

var pym = require("./lib/pym");
require("./lib/webfonts");
var classify = require("./lib/helpers/classify.js");

// Global vars
var pymChild = null;

var renderColumnChart = require("./renderColumnChart");

// Initialize the graphic.
var onWindowLoaded = function() {
  render(window.DATA);

  window.addEventListener("resize", () => render(window.DATA));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Render the graphic(s)
var render = function(data) {
  // Render the chart!
  var container = "#column-chart";
  var element = document.querySelector(container);

  element.innerHTML = "";

  var charts = DATA.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq

  charts.forEach((c) => {
    var chartData = DATA.filter(function(d, i) {
      return d.chart == c;
    });

    var chart = document.createElement("div");
    chart.className = "chart " + classify(c);
    element.appendChild(chart);

    var width = chart.offsetWidth;

    renderColumnChart({
      container: ".chart." + classify(c),
      width,
      data: chartData,
      title: c,
      labelColumn: "label",
      valueColumn: "amt"
    });

  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
window.onload = onWindowLoaded;
