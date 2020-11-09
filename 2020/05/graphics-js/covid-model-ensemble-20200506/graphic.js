console.clear();

var pym = require("./lib/pym");
require("./lib/webfonts");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
};
var { classify } = require("./lib/helpers");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA);



  // set the dates

  var dateProjs = [];
  var modelNames = [];

  for (i in series) {
    if (series[i].name.indexOf("%") > -1) {
      var thisName= series[i].name.split("%")[0];
      if (thisName != undefined && modelNames.indexOf(thisName) == -1 && thisName != "deaths") {
        console.log(thisName)
        modelNames.push(thisName)
      }
      if (MODEL != "all") {
        if (['COVID forecast hub - ensemble', MODEL].indexOf(thisName) == -1) {
          continue;
        }
      }
      var thisDate= series[i].name.split("%")[1];
      if (thisDate != undefined && dateProjs.indexOf(thisDate) == -1) {
        if (new Date(thisDate) > new Date("3/28/2020")) {
          dateProjs.push(thisDate)
        }
      }
    }
  }


  // set thisProjDate

  var interval;
  var thisProjDateIndex = 0;
  var isPaused = false;
  var manualPause = false;
  var addedCharts = [];

  var beginRender = function() {
    var thisProjDate = dateProjs[thisProjDateIndex];
    var thisProjData = series.filter(x=>x.name.indexOf(thisProjDate) > -1 || x.name.indexOf("%") == -1);
    render(thisProjData, thisProjDate, dateProjs, modelNames, addedCharts);


    window.clearInterval(interval);
    interval = window.setInterval(function() {
      if (isPaused || manualPause) { return }


      if (thisProjDateIndex == dateProjs.length - 2) {
        isPaused = true;
        window.setTimeout(function(){isPaused = manualPause}, 3000)
      }
        

      if (thisProjDateIndex + 1 < dateProjs.length) {
        thisProjDateIndex++;
      }
      else {
        thisProjDateIndex = 0;
      }
      var thisProjDate = dateProjs[thisProjDateIndex];
      var thisProjData = series.filter(x=>x.name.indexOf(thisProjDate) > -1 || x.name.indexOf("%") == -1);
      render(thisProjData, thisProjDate, dateProjs, modelNames, addedCharts)  
      
    }, 800)  
  }

  


  beginRender();



  window.addEventListener("resize", () =>  beginRender());


   // animation controls

  d3.select(".animate span").on('click', function() {
    var onStatus = d3.select(this).classed('on');

    d3.select(this).classed("on", !onStatus);
    d3.select(this).classed("off", onStatus);

    var existText = d3.select(this).text();
    var altText = d3.select(this).attr("alt-text")

    d3.select(this).text(altText)
    d3.select(this).attr("alt-text", existText)

    manualPause = onStatus;
    isPaused = manualPause;
  })


  d3.selectAll(".proj-date .date-button").on("click", function() {
    var ind = d3.select(this).attr("data-ind");
    thisProjDateIndex = ind;
    manualPause = true;
    isPaused = manualPause;
    beginRender();



    d3animSpan = d3.select(".animate span")

    var existText = d3animSpan.text();
    var altText = d3animSpan.attr("alt-text")

    if (d3animSpan.classed("on")) {
      d3animSpan.text(altText)
      d3animSpan.attr("alt-text", existText) 
      d3animSpan.classed("off", true);
      d3animSpan.classed("on", false); 
    }


  })



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
var render = function(data, thisProjDate, dateProjs, modelNames, addedCharts) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // contrain to mm size

  width > 650 ? width = 650 : width = width;


  if (MODEL == 'all') {
    renderLineChart({
      container,
      width,
      thisProjDate,
      data,
      dateColumn: "date",
      valueColumn: "amt",
      dateProjs,
      modelName: "all",
      NAMEKEYS
    });  
  }


  


  // add in smaller charts

  

  var makeSmallChart = function(inputName, addedCharts) {
    var keyedName  = NAMEKEYS[inputName]
    if (addedCharts.indexOf(keyedName) == -1) {
      d3.select(".graphic").append("div")
        .attr("class", "line-chart-sm graphic-sm")
        .attr("id", "line-chart-" + classify(keyedName))
      addedCharts.push(keyedName)  
    }
    

    var container = "#line-chart-" + classify(keyedName);
    var element = document.querySelector(container);
    var width = element.offsetWidth;
    var thisData = data.filter(x=>x.name == 'deaths' || NAMEKEYS[x.name.split("%")[0]] == keyedName)
    renderLineChart({
      container,
      width,
      thisProjDate,
      data:thisData,
      dateColumn: "date",
      valueColumn: "amt",
      dateProjs,
      modelName: NAMEKEYS[inputName],
      NAMEKEYS
    });
  }


  if (MODEL != "all") {
    makeSmallChart('COVID forecast hub - ensemble', addedCharts);
    console.log("============")
    console.log(NAMEKEYS)
    console.log(modelNames)
    console.log(MODEL)
    console.log("============")
    var matchingModels = modelNames.filter(x => NAMEKEYS[x] == MODEL);
    console.log(matchingModels)
    for (i in matchingModels) {
      makeSmallChart(matchingModels[i], addedCharts);
    } 
  }


  



  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
