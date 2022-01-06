var pym = require("./lib/pym");
require("./lib/webfonts");

// Global vars
var pymChild = null;

var renderColumnChart = require("./_renderColumnChart");

// Initialize the graphic.
var onWindowLoaded = function() {
  //console.log(window.DATA)
  var trimmedData = window.DATA.slice(1)  

  var series = formatData(window.LINE_DATA)
  render(trimmedData,series);

  window.addEventListener("resize", () => render(trimmedData,series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  data.forEach(function(d) {
    //if (d.date instanceof Date) return;
    //var [m, day, y] = d.date.split("/").map(Number);
    //y = y > 50 ? 1900 + y : 2000 + y;
    //d.date = new Date(d.date);
  });

  // Restructure tabular data for easier charting.
  //for (var column in data) {
   // if (column == "date") continue;

    series.push({
      name: 'sevenDayAvg',
      values: data.map(d => ({
        date: d.date,
        amt: d['amt']
      }))
    });
  //}

  return series;
};

// Render the graphic(s)
var render = function(data,lineData) {
  // Render the chart!
  var container = "#column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderColumnChart({
    container,
    width,
    data,
    lineData,
    labelColumn: "date",
    valueColumn: 'new_administered',
    offset: window.OFFSET,
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
window.onload = onWindowLoaded;
