var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA,window.VOTES);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function(data,votes) {
  var series = [];

  votesReshape = {
    2020: votes[0],
    2016: votes[1],
    2012: votes[2]
  }

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;


    series.push({
      name: column,
      values: data.map(function(d){
        // console.log(d.date)
        // console.log(column)
        return {
          date: d.date,
          amt: d[column] * 100,
          voteMargin: votesReshape[d.date][column]
        }
      })
    });
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
    voteMarginColumn: "voteMargin",
    annotations: ANNOTATIONS
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
