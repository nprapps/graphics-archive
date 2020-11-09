var pym = require("./lib/pym");
require("./lib/webfonts");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min")
};
var { classify } = require("./lib/helpers");

// Global vars
var pymChild = null;
var renderStackedBarChart = require("./renderStackedBars");
var skipLabels = [ "label", "values", "grouping", "img" ];

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = formatData(window.DATA);
  render(data);

  window.addEventListener("resize", () => render(data));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function(input) {
  var data = input.map(function(d) {
    var x0 = 0;

    var { label } = d;
    var grouping = d.grouping;
    var img = d.img;
    var values = [];

    for (var name in d) {
      if (skipLabels.indexOf(name) > -1) {
        continue;
      }

      var x1 = x0 + d[name];
      var val = d[name];

      values.push({
        name,
        x0,
        x1,
        val
      });

      x0 = x1;
    }

    return { label, grouping, values, img };

  });

  return data;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var containerElement = d3.select(container);
  containerElement.html("");

  // define # of charts
  var charts = data.map(o => o['grouping']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq

  // set mins/maxes
  var roundTicksFactor = 10;
  var values = data.map(d => d.values[d.values.length - 1].x1);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  var max = Math.max(...ceilings);

  if (min > 0) {
    min = 0;
  }

  // create each chart
  charts.forEach((item, i) => {
    var chartData = data.filter(function(v, k) {
      return v.grouping == item;
    })
    var showLegend = i == 0 ? true : false;
    var showAxis = i == (charts.length - 1) ? true : false;

    var xDomain = [ min, max ];

    containerElement.append("div")
      .attr("class", "chart " + classify(item));

    renderStackedBarChart({
      container: ".chart." + classify(item),
      width,
      data: chartData,
      showLegend,
      showAxis,
      xDomain,
      labelColumn: "label",
      nameColumn: "name",
      id: item,
      units: "opinions"
    });

  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
