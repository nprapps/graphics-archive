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
  var series_black = formatData(window.DATA_BLACK);
  var series_latino = formatData(window.DATA_LATINO);
   var series_white = formatData(window.DATA_WHITE);

  var series_democrat = formatData(window.DATA_DEMOCRAT);
  var series_republican = formatData(window.DATA_REPUBLICAN);
   var series_independent = formatData(window.DATA_INDEPENDENT);

  render([series_black,
          series_white,
          series_latino,
          series_democrat,
          series_republican,
          series_independent
         ])

  window.addEventListener("resize", () => render([series_black,
                                                  series_latino,
                                                  series_white,
                                                 series_democrat,
                                                  series_independent,
                                                  series_republican,
                                                 ]));

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
  //console.log(stackedData)
  return stackedData;
};

// Render the graphic(s). Called by pym with the container width.
// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#area-chart";
  var raceContainer = "#race-charts";
  var partyContainer = "#party-charts";
  var element = document.querySelectorAll(".graphic");
  var graphicElement = document.querySelector(".graphic");

  var width = graphicElement.offsetWidth;



  //console.log(width)

  element.forEach(function(d){
    d.innerHTML = ''
  });

  var categories = [
  "Black","Latino",
                    "White",
                    "Democrat",
                    "Independent",
                    "Republican",];

  categories.forEach(function(category,i){
    var categoryData = data.filter(function(item){
      //console.log(item)
      //console.log(item[0])
      if (item[0].key == category){
        return item
      }
    })

    if (i < 3){
      renderLineChart({
      container:raceContainer,
      width,
      data: categoryData[0],
      dateColumn: "date",
      valueColumn: "amt",
      category: category
    });

    }else {
      renderLineChart({
      container:partyContainer,
      width,
      data: categoryData[0],
      dateColumn: "date",
      valueColumn: "amt",
      category: category
    });
    }

    

    // if (category == 'Overall') {
    //   renderLineChartOverall({
    //   container,
    //   width,
    //   data: categoryData[0],
    //   dateColumn: "date",
    //   valueColumn: "amt",
    //   category: category
    // });
    // }
    // else {
      
 // }
    
  })

  // var partyLabel = document.querySelector("#party-label")
  // var areaChart = document.querySelector("#area-chart")

  // // console.log(areaChart.getBoundingClientRect().height/2)
  // // console.log(partyLabel.getBoundingClientRect().top)

  // var partyLabelTop = partyLabel.getBoundingClientRect().top
  // partyLabel.top = partyLabelTop + areaChart.getBoundingClientRect().height/2 + "px"

    

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
