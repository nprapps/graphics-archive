var pym = require("./lib/pym");
require("./lib/webfonts");
var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-shape/dist/d3-shape.min")
};
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var renderSingle = require("./renderSingle");

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
  // console.log(data)
  // var series = [];
  // votesReshape = {
  //   2020: votes[0],
  //   2016: votes[1],
  // }
  //Restructure tabular data for easier charting.
  // for (var column in data[0]) {
  //   if (column == "date") continue;
  //   series.push({
  //     name: column,
  //     values: data.map(function(d){
  //       return {
  //         date: d.date,
  //         amt: d[column],
  //         voteMargin: d.total_votect,
  //         type: d.type
  //       }
  //     })
  //   });
  // }
  // var groupbyState = [];
  // groupbyState = data.reduce((acc, value) => {
  //   if (!acc[value.state]) {
  //     acc[value.state] = [];
  //   }
  //
  //   //grouping
  //   acc[value.state].push(value);
  //
  //   return acc;
  // })

  var groupBy = function (array , f) {
    var groups = {};
    var state;
    var county;
    // console.clear()
    // console.log(array, f)
    array.forEach(function(o) {
      var group = JSON.stringify( f(o) );
      groups[group] = groups[group] || [];
      state = o.state;
      county = o.name;
      type = o.type;
      groups[group].state = state;
      groups[group].name = county;
      groups[group].type = type;
      groups[group].push(o);
    });
    return Object.keys(groups).map(function(group) {
      return groups[group];
    })
  };

  var series = groupBy(data, function(item) {
    return [item.state, item.name];
  });

  // console.log(series);
  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  // var states = ["Arizona", "Michigan", "Pennsylvania", "Wisconsin", "Georgia"];
  element.innerHTML = "";
  document.querySelector("#total-vote").innerHTML = "";

  // container
  //   .append("g")

  // for (i in states) {
    renderSingle({
      container,
      width: width,
      data,
      dateColumn: "date",
      valueColumn: "winner_margin",
      voteMarginColumn: "total_votect"
    });
  // }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
