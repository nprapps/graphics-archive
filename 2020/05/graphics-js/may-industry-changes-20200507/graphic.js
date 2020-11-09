var pym = require("./lib/pym");
require("./lib/webfonts");

var {  classify} = require("./lib/helpers");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
};

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA);
  render(series);

  window.addEventListener("resize", () => render(series));

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
var render = function(data) {
  // Render the chart!
  


  if (IDNAME == 'medical') {
    var container = "#line-chart";
    var element = document.querySelector(container);
    var width = element.offsetWidth;;
    var showKey = false;
    data = data.filter(x=>SHOWONLYMEDICAL.indexOf(x.name) > -1);
    for (i in INDUSTRYDATA) {
      INDUSTRYDATA[i].default = false;
      if (OVERRIDEDEFAULTMEDICAL.indexOf(INDUSTRYDATA[i].name) > -1) {
        INDUSTRYDATA[i].default = true;
      }
    }
    var title = 'medical'
     renderLineChart({
      container,
      width,
      data,
      dateColumn: "date",
      valueColumn: "amt",
      INDUSTRYDATA,
      showKey,
      title,
      JANAPRRAW
    });
  }


  else {
    var industryTypes = [];
    var lastIndustry = "";
    for (i in INDUSTRYDATA) {
      var type2 = INDUSTRYDATA[i].type2
      if (type2 != lastIndustry && type2 != undefined) {
        lastIndustry = type2;
        var d = {}
        d['type2'] = type2;
        var thisValues = data.filter(x=>x.name == type2)[0].values
        d['pctChange'] = thisValues[thisValues.length - 1].amt
        industryTypes.push(d)
      }
    }




    var sortDrop = function(a,b) {
      if (a.type2.indexOf("Other") > -1) {
        return 1
      }
      if (a.pctChange > b.pctChange) {
        return 1;
      }
      else {
        return -1;
      }
    }

    industryTypes.sort(sortDrop);



    d3.select(".graphic-wrapper").html("")
    for (i in industryTypes) {
      var title = industryTypes[i].type2;
      d3.select(".graphic-wrapper").append("div").attr('class', "index graphic").attr("id", "line-chart-" + classify(title))
      var container = "#line-chart-" + classify(title);
      var element = document.querySelector(container);
      var width = element.offsetWidth;;
      var showKey = false;
      showKey = true;
      showData = data.filter(x=>INDUSTRYDATA.filter(y=>y.name == x.name)[0].type2 == title);
       renderLineChart({
        container,
        width,
        data: showData,
        dateColumn: "date",
        valueColumn: "amt",
        INDUSTRYDATA,
        showKey,
        title,
        JANAPRRAW
      });
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
