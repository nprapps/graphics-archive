var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var skipLabels = ["date", "days_since_first","annotate", "x_offset", "y_offset","type","x_offset_mobile","y_offset_mobile","isRange","isLeft"];

var renderLineChart = require("./renderAnnotatedLine");
var {formatDate} = require("./utils")

// Initialize graphic
var onWindowLoaded = function() {
  var { annotations, series } = formatData(window.CITY);
  var other_data = formatData(window.OTHER_DATA);  
  render(series, annotations, other_data.series);
  window.addEventListener("resize", () => render(series, annotations, other_data.series));

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

    d.date = formatDate(d.date);

    for (var series in d) {
      if (skipLabels.includes(series) || !(series in d)) continue;

      // Annotations
      var hasAnnotation = !!d.annotate;
      if (hasAnnotation) {
        var hasCustomLabel = d.annotate !== true;
        var label = hasCustomLabel ? d.annotate : null;

        var xOffset = Number(d.x_offset) || 0;
        var yOffset = Number(d.y_offset) || 0;
        // var xOffsetMobile = Number(d.x_offset_mobile) || 0; 
        // var yOffsetMobile = Number(d.y_offset_mobile) || 0; 

        annotations.push({
          date: d.date,
          days: d.days_since_first,
          amt: d[series],
          series,
          xOffset,
          yOffset,          
          label,
          type: d.type,
          isLeft: d.isLeft
        });
      }
    }
  });

  // Restructure tabular data for easier charting.
  for (var name in data[0]) {
    if (skipLabels.includes(name)) continue;

    var values = data.filter(d => d[name]).map(function(d) {
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
var render = function(data, annotations, other_data) {
  var container = "#annotated-line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Render the chart!
  renderLineChart({
    container,
    width,
    data,
    annotations,
    other_data,
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