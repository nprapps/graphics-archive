var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var skipLabels = [
  "cpi",
  "month",
  "annotate",
  "x_offset",
  "y_offset",
  "x_offsetMobile",
  "y_offsetMobile",
  "lineMobile",
];

var renderLineChart = require("./renderAnnotatedLine");

// Initialize graphic
var onWindowLoaded = function () {
  var { annotations, series } = formatData(window.DATA);
  var labels = window.LABELS;
  render(series, annotations, labels);
  window.addEventListener("resize", () => render(series, annotations, labels));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Reformat data for renderAnnotatedLine()
var formatData = function (data) {
  var annotations = [];
  var series = [];

  data.forEach(function (d) {
    var [m, day, y] = d.month.split("/").map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    d.month = new Date(y, m - 1, day);

    // Annotations
    var hasAnnotation = !!d.annotate;
    if (hasAnnotation) {
      var hasCustomLabel = d.annotate !== true;
      var label = hasCustomLabel ? d.annotate : null;

      var xOffset = Number(d.x_offset) || 0;
      var yOffset = Number(d.y_offset) || 0;

      var xOffsetMobile = Number(d.x_offsetMobile) || xOffset;
      var yOffsetMobile = Number(d.y_offsetMobile) || yOffset;

      var lineMobile = d.lineMobile || false;

      annotations.push({
        month: d.month,
        retail_real: d.retail_real,
        grocery_real: d.grocery_real,
        xOffset,
        yOffset,
        xOffsetMobile,
        yOffsetMobile,
        lineMobile,
        label,
      });
    }

    // for (var series in d) {
    //   if (skipLabels.includes(series) || !(series in d)) continue;
    //
    //   // Annotations
    //   var hasAnnotation = !!d.annotate;
    //   if (hasAnnotation) {
    //     var hasCustomLabel = d.annotate !== true;
    //     var label = hasCustomLabel ? d.annotate : null;
    //
    //     var xOffset = Number(d.x_offset) || 0;
    //     var yOffset = Number(d.y_offset) || 0;
    //
    //     var xOffsetMobile = Number(d.x_offsetMobile) || xOffset;
    //     var yOffsetMobile = Number(d.y_offsetMobile) || yOffset;
    //
    //     var lineMobile = d.lineMobile || false;
    //
    //     annotations.push({
    //       month: d.month,
    //       amt: d[series],
    //       series,
    //       xOffset,
    //       yOffset,
    //       xOffsetMobile,
    //       yOffsetMobile,
    //       lineMobile,
    //       label,
    //     });
    //   }
    // }
  });

  // Restructure tabular data for easier charting.
  for (var name in data[0]) {
    if (skipLabels.includes(name)) continue;

    var values = data.map(function (d) {
      return {
        month: d.month,
        amt: d[name],
      };
    });
    // filter out empty data, if your set is inconsistent
    values = values.filter(d => d.amt);
    series.push({ name, values });
  }

  return { series, annotations };
};

/*
 * Render the graphic(s).
 */
var render = function (data, annotations, labels) {
  var container = "#annotated-line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Render the chart!
  renderLineChart({
    container,
    width,
    data,
    annotations,
    labels,
    dateColumn: "month",
    valueColumn: "amt",
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
