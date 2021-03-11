var pym = require("./lib/pym");
require("./lib/webfonts");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
};

var pymChild;
var renderLineChart = require("./renderLineChart");
var allCounties = [];

//Initialize graphic
var onWindowLoaded = function () {
  var series = formatData(window.DATA);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function (data) {
  var series = [];
  var abbrevs = {'California': 'Calif.', 'Oregon': 'Ore.', 'Washington': 'Wash'}
  allCounties = Object.keys(data[0]).filter(e => e !== "date");

  data.forEach(function (d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;
    var values = data.map(function(d){ 
        if (d[column]) {
          return {
        date: d.date,
        amt: d[column],
        }
        }
        
    });
    values = values.filter(v => v != undefined)
    series.push({
      name: column,
      values: values,
    });
  }

  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function (data) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Dropdown
  var stateMenu = d3.select("#dropdown");
  var section = document.getElementById("dropdown");
  section.value = "Marion County, Ore."

  stateMenu
    .selectAll("option")
    .data(allCounties)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

  stateMenu.on("change", function () {
    stateSelection = section.options[section.selectedIndex].value;
    renderLineChart({
      container,
      width,
      data,
      dateColumn: "date",
      valueColumn: "amt",
      stateSelection,
    });

    d3.selectAll(".highlight").moveToFront();
  });

  renderLineChart({
      container,
      width,
      data,
      dateColumn: "date",
      valueColumn: "amt",
      stateSelection: section.options[section.selectedIndex].value,
    });
  d3.selectAll(".highlight").moveToFront();

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//  *
// * Select an element and move it to the front of the stack
// */
d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
