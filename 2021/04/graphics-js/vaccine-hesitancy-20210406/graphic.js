var pym = require("./lib/pym");
require("./lib/webfonts");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  //var series = formatData(window.DATA);
  var series= formatData(window.DATA);
  // var series_latinx = formatData(window.DATA_LATINX);
  // var series_white = formatData(window.DATA_WHITE);
  // var series_asian = formatData(window.DATA_ASIAN);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
//Format graphic data for processing by D3.
var formatData = function(data) {

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    //y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  var dataKeys = Object.keys(data[0]).slice(1);
  var stackedData = d3.stack().keys(dataKeys)(data);  

  return stackedData;
};

// Render the graphic(s). Called by pym with the container width.
// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#area-chart";
  var element = document.querySelector(".graphic");
  var width = element.offsetWidth;

  //console.log(width)

  element.innerHTML = '';
  
  //var categories = ['LATINX']//,'WHITE','BLACK','ASIAN']

  //var dataOther = data[0];

  //categories.forEach(function(category, i) {

  //var data_by_race = data;

    renderLineChart({
      container,
      width,
      data: data,
      dateColumn: "date",
      valueColumn: "amt",
    });

    //  renderLineChart({
    //   container,
    //   width,
    //   data: data2,
    //   dateColumn: "date",
    //   valueColumn: "amt",
    //   category: "Hispanic/Latinx"
    // });

    //  renderLineChart({
    //   container,
    //   data: data4,
    //   width,
    //   dateColumn: "date",
    //   valueColumn: "amt",
    //   category: "Asian"
    // });

    //  renderLineChart({
    //   container,
    //   data: data3,
    //   width,
    //   dateColumn: "date",
    //   valueColumn: "amt",
    //   category: "White"
    // });

     

  //}
  //)

  

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};


//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
