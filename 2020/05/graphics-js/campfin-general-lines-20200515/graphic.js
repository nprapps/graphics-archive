console.clear();

var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA.concat(HISTORICAL_DATA), DATA_AMEND);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function(data, DATA_AMEND) {


  // handle amendments

  var amendedData = data.filter(x=>x.amended == true);

  for (i in amendedData) {
    var thisFiling = amendedData[i]
    var matchingFiling = DATA_AMEND.filter(x=>x.endDate == thisFiling.endDate && x.last == thisFiling.last && x.amended != true)[0];
    console.log(thisFiling.spending - matchingFiling.spending)
    console.log(thisFiling.cashOnHand - matchingFiling.cashOnHand)
    console.log()
    console.log('=======')
    data.splice(data.indexOf(thisFiling), 1, matchingFiling)
  }


  // filter to just what we have data for from trump + biden

  var trumpBidenReportTypes = [];

  var trumpBidenData = data.filter(x=>["Joe Biden", "Donald Trump"].indexOf(x.candidateName) > -1 && x.cashOnHand != undefined)
  

  trumpBidenReportTypes = trumpBidenData.map(x=>x.reportType)

  data = data.filter(x=>trumpBidenReportTypes.indexOf(x.reportType) > -1)




  var measure = 'totalRaised';

  var candidates = {};

  for (i in data) {
    thisCand = data[i]
    data[i].nameYear = data[i].year == undefined ?  data[i].candidateName : data[i].candidateName + "%" + data[i].year;
  }




  for (i in data) {
    var thisCand = data[i].nameYear;
    if (candidates[thisCand] == undefined) {
      candidates[thisCand] = 0;
    }
  }

  // set trump reelect base amount on jan 1 2019
  candidates['Donald Trump'] = 78813806.15
 

  var series = [];

  data.forEach(function(d) {
    if (d.date instanceof Date == false && d.date != undefined) {
        var [m, day, y] = d.date.split("/").map(Number);
        if (y < 2000) {
          y = y > 50 ? 1900 + y : 2000 + y;
        }
        d.date = new Date(y, m - 1, day);
    }

    if (d.endDate instanceof Date == false && d.endDate != undefined) {
        var [m, day, y] = d.endDate.split("/").map(Number);
        if (y < 2000) {
          y = y > 50 ? 1900 + y : 2000 + y;
        }
        d.endDate = new Date(y, m - 1, day);
    }
  });



  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column != measure) continue;
    for (thisCand in candidates) {
        series.push({
          name: column + "-" + thisCand,
          values: data.filter(x=>x.nameYear == thisCand).map(function(d){
            if (d.cashOnHand != undefined) {
              candidates[thisCand] += d[column]
            }
            else {
              candidates[thisCand] = d[column]
            }
            return ({
              date: d.endDate,
              amt: candidates[thisCand]
            })
          })
        });
        
    }

  }


  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data,
    dateColumn: "date",
    valueColumn: "amt",
    LINE_OFFSETS
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
