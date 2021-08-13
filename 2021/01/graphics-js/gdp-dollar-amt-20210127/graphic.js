var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var skipLabels = ["date", "annotate", "x_offset", "y_offset"];

var renderLineChart = require("./renderAnnotatedLine");

// Initialize graphic
var onWindowLoaded = function() {
  var { annotations, series } = formatData(window.DATA);
  render(series, annotations);
  window.addEventListener("resize", () => render(series, annotations));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Reformat data for renderAnnotatedLine()
var formatData = function(data) {
  var annotations = [];
  var series = [];

  data.forEach(function(d) {
    var [m, day, y] = d.date.split("/").map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);

    for (var series in d) {
      if (skipLabels.includes(series) || !(series in d)) continue;

      // Annotations
      var hasAnnotation = !!d.annotate;
      if (hasAnnotation) {
        var hasCustomLabel = d.annotate !== true;
        var label = hasCustomLabel ? d.annotate : null;

        var xOffset = Number(d.x_offset) || 0;
        var yOffset = Number(d.y_offset) || 0;

        annotations.push({
          date: d.date,
          amt: d[series],
          series,
          xOffset,
          yOffset,
          label
        });
      }
    }
  });

  // Restructure tabular data for easier charting.
  for (var name in data[0]) {
    if (skipLabels.includes(name)) continue;

    var values = data.map(function(d) {
      return {
        date: d.date,
        amt: d[name]
      };
    });
    // filter out empty data, if your set is inconsistent
    // values = values.filter(d => d.amt);
    series.push({ name, values });
  }

  return { series, annotations };
};

/*
 * Render the graphic(s).
 */
var render = function(data, annotations) {
  var container = "#annotated-line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Render the chart!
  renderLineChart({
    container,
    width,
    data,
    annotations,
    dateColumn: "date",
    valueColumn: "amt"
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