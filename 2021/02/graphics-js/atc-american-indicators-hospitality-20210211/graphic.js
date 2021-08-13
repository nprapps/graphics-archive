var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA);
  var travel = formatData(window.TRAVEL)
  render(series,travel);

  window.addEventListener("resize", () => render(series,travel));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }

  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data, data2) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  element.innerHTML = '';

  //console.log(data);

  renderLineChart({
    container,
    width,
    data:data2,
    dateColumn: "date",
    valueColumn: "amt",
    category: 'travel'
  });
  renderLineChart({
    container,
    width,
    data,
    dateColumn: "date",
    valueColumn: "amt",
    category: 'unemployment'
  });



  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
