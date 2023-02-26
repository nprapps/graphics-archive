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
var renderLineChartOverall = require("./renderLineChartOverall");

//Initialize graphic
var onWindowLoaded = function() {
  //var series = formatData(window.DATA);
  //var series_black = formatData(window.DATA_BLACK);
  var series_transportation = formatData(window.DATA_TRANSPORTATION);
  var series_power = formatData(window.window.DATA_POWER);
  //var series_lulucf = formatData(window.DATA_LULUCF)

  var series_buildings = formatData(window.DATA_BUILDINGS);
  var series_oil = formatData(window.window.DATA_OIL);
  var series_industry = formatData(window.DATA_INDUSTRY)
  var series_agriculture = formatData(window.DATA_AGRICULTURE)
  var series_other = formatData(window.DATA_OTHER)
  var series_overall = formatData(window.DATA_OVERALL)
  // var series_white = formatData(window.DATA_WHITE);
  // var series_asian = formatData(window.DATA_ASIAN);
  render([series_transportation,
         series_power,
         //series_lulucf,
         series_buildings,
         series_oil,
         series_industry,
         series_agriculture,
         series_other,
         series_overall])

  window.addEventListener("resize", () => render([series_transportation,
                                                 series_power,
                                                 //series_lulucf,
                                                 series_buildings,
                                                 series_oil,
                                                 series_industry,
                                                 series_agriculture,
                                                 series_other,
                                                 series_overall]));

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

  //console.log(data)

  var categories = ['Overall',
                    'Electric Power',
                    "Oil & Gas",
                    "Industry",
                    "Transportation",
                    // "Buildings",
                    // "Agriculture",
                    // "Other",
                    /*"LULUCF"*/];

  categories.forEach(function(category,i){
    var categoryData = data.filter(function(item){
      //console.log(item)
      //console.log(item[0])
      if (item[0].key == category){
        return item
      }
    })

    if (category == 'Overall') {
      renderLineChartOverall({
      container,
      width,
      data: categoryData[0],
      dateColumn: "date",
      valueColumn: "amt",
      category: category
    });
    }
    else {
      renderLineChart({
      container,
      width,
      data: categoryData[0],
      dateColumn: "date",
      valueColumn: "amt",
      category: category
    });
  }
    
  })

    

    //  renderLineChart({
    //   container,
    //   width,
    //   data: data2,
    //   dateColumn: "date",
    //   valueColumn: "amt",
    //   category: "Power"
    // });

    //  renderLineChart({
    //   container,
    //   data: data3,
    //   width,
    //   dateColumn: "date",
    //   valueColumn: "amt",
    //   category: "LULUCF"
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
