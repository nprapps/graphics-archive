var pym = require("./lib/pym");
require("./lib/webfonts");

var { COLORS } = require("./lib/helpers");

var pymChild;
var skipLabels = [
  "date",
  "annotate",
  "x_offset",
  "y_offset",
  "annotate_actual",
  "y_line_offset",
];

var renderLineChart = require("./renderAnnotatedLine");

// Initialize graphic
var onWindowLoaded = function () {
  var { annotations, series } = formatData(window.DATA);
  var repAnnos = annotations;
  var repSeries = series;
  var { annotations, series } = formatData(window.DATA_DEM);
  render(repSeries, repAnnos, annotations, series);
  window.addEventListener("resize", () =>
    render(repSeries, repAnnos, annotations, series)
  );

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
    var [m, day, y] = d.date.split("/").map(Number);
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
        var yLineOffset = Number(d.y_line_offset) || 0;

        annotations.push({
          date: d.date,
          lineAmt: d[series] * 100,
          amt: d.annotate_actual * 100,
          series,
          xOffset,
          yOffset,
          yLineOffset,
          label,
        });
      }
    }
  });

  // Restructure tabular data for easier charting.
  for (var name in data[0]) {
    if (skipLabels.includes(name)) continue;

    var values = data.map(function (d, i) {
      return {
        date: d.date,
        amt: d[name] * 100,
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
var render = function (data, annotations, annotationDem, dataDem) {
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
    valueColumn: "amt",
    color: COLORS.red3,
    number: 1,
    chart: 'Republicans',
  });

  // Render the chart!
  renderLineChart({
    container,
    width,
    data: dataDem,
    annotations: annotationDem,
    dateColumn: "date",
    valueColumn: "amt",
    color: COLORS.blue2,
    number: 2,
    chart: 'Democrats',
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
