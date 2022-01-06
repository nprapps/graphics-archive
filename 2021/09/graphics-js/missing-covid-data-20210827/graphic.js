var { Sidechain } = require("@nprapps/sidechain");
Sidechain.registerGuest();
require("./lib/webfonts");

var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA);
  render(series);

  var all = document.querySelector(".all")
  all.style.display = "none";
  document.querySelector(".show-all").addEventListener("click", function() {
    all.style.display = "";
    this.remove();
  });

  window.addEventListener("resize", () => render(series));
};

//Format graphic data for processing by D3.
var formatData = function(data, state) {
  var series = [];

  data = data.filter(d => d.state == state);

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;
    if (column == "state") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column] > 100 ? 100 : d[column]
      }))
    });
  }

  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var parent = document.querySelector("#line-chart");

  var children = parent.querySelectorAll(".chart");

  console.clear();
  for (var element of children) {

    var width = element.offsetWidth;

    var data = formatData(window.DATA, element.dataset.state);

    renderLineChart({
      element,
      width,
      data,
      dateColumn: "date",
      valueColumn: "amt"
    });

  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
