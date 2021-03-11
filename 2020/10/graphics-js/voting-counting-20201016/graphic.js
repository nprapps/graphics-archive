var pym = require("./lib/pym");
require("./lib/webfonts");

var { COLORS, classify } = require("./lib/helpers");

// Global config

var COLOR_BINS = [-2, -1, 0, 1, 2];
var COLOR_RANGE = [
  COLORS.teal3,
  COLORS.teal3,
  COLORS.orange3,
  COLORS.orange3,
  COLORS.orange3
];

// Global vars
var pymChild = null;

var renderBlockHistogram = require("./renderBlockHistogram");

// Initialize the graphic.
var onWindowLoaded = function() {
  var binned = formatData(window.DATA, 'processing_bucket');
  render(binned);

  window.addEventListener("resize", () => render(binned));

  pym.then(child => {
    pymChild = child;
    pymChild.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function(data, label) {
  var numBins = COLOR_BINS.length - 1;
  var binnedData = [];

  // init the bins
  for (var i = 0; i < numBins; i++) {
    binnedData[i] = [];
  }

  // put states in bins
  data.forEach(function(d) {
    if (d['counting_bucket'] != null) {
      var state = d.usps;

      for (var i = 0; i < numBins; i++) {
        if (d['counting_bucket'] >= COLOR_BINS[i] && d['counting_bucket'] < COLOR_BINS[i + 1]) {
          binnedData[i].unshift(state);
          break;
        }
      }
    }
  });
  console.log(binnedData)
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
    valueColumn: "processing_bucket"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
