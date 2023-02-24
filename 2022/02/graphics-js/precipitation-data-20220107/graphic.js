var pym = require("./lib/pym");
require("./lib/webfonts");

// Global config
// var COLOR_BINS = [-4, -2, 0, 2, 4, 6, 8, 10];
var COLOR_BINS = [];
for (let i=1970; i<2021; i+=5) {
  COLOR_BINS.push(i); 
}
var COLOR_RANGE = [
  // "#e68c31",
  // "#eba934",
  "#efc637",
  "#c6b550",
  "#99a363",
  "#6a9171",
  "#17807e"
];

// Global vars
var pymChild = null;

var renderBlockHistogram = require("./renderBlockHistogram");

// Initialize the graphic.
var onWindowLoaded = function() {
  var binned = formatData(window.DATA);
  render(binned);

  window.addEventListener("resize", () => render(binned));

  pym.then(child => {
    pymChild = child;
    pymChild.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function(data) {
  var numBins = COLOR_BINS.length - 1;
  var binnedData = [];

  // init the bins
  for (var i = 0; i < numBins; i++) {
    binnedData[i] = [];
  }

  // put states in bins
  data.forEach(function(d) {
    if (d.year != null) {
      var state = d.usps;

      for (var i = 0; i < numBins; i++) {
        if (d.year >= COLOR_BINS[i] && d.year < COLOR_BINS[i + 1]) {
          binnedData[i].unshift(state);
          break;
        }
      }
    }
  });

  return binnedData;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#block-histogram";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBlockHistogram({
    container,
    width,
    data,
    bins: COLOR_BINS,
    colors: COLOR_RANGE,
    labelColumn: "usps",
    valueColumn: "year"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
