var pym = require("./lib/pym");
require("./lib/webfonts");

// Global vars
var pymChild = null;
var renderStackedBarChart = require("./renderStackedBars");
var skipLabels = ["label"];

// Initialize the graphic.
var onWindowLoaded = function() {
  var data_women = formatData(window.DATA,"Women","Men");
  var data_nonwhite = formatData(window.DATA,"Nonwhite","White");
  var data_govt = formatData(window.DATA,"Government","Non-government");
  var data_whitemen = formatData(window.DATA,"White men","Non-white men");
  render(data_women,data_nonwhite,data_govt,data_whitemen);

  window.addEventListener("resize", () => render(data_women,data_nonwhite,data_govt,data_whitemen));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function(input,col1,col2) {
  var data = input.map(function(d) {

    
    var x0 = 0;

    var { label } = d;
    //console.log(d);
    var values = [];

    for (var name in d) {
      //console.log(name)
      if (skipLabels.indexOf(name) > -1) {
        continue;
      }

      if (name == col1 || name == col2) {

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
    }

    return { label, values };

  });
  //console.log(data)
  //var skipLabels = ["labels"];
  return data;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data1,data2,data3,data4) {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  element.innerHTML = "";
  //var width = element.offsetWidth;
  
  renderStackedBarChart({
    container,
    width: 350,
    data: data1,
    labelColumn: "label",
    nameColumn: "name",
    theme: "WOMEN",
  });

  renderStackedBarChart({
    container,
    width: 350,
    data: data2,
    labelColumn: "label",
    nameColumn: "name",
    theme: "NONWHITE",
  });

  

  renderStackedBarChart({
    container,
    width: 350,
    data: data4,
    labelColumn: "label",
    nameColumn: "name",
    theme: "WHITE MEN",
  });

  renderStackedBarChart({
    container,
    width: 350,
    data: data3,
    labelColumn: "label",
    nameColumn: "name",
    theme: "GOVERNMENT EXPERIENCE",
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
