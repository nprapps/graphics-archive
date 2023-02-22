var pym = require("./lib/pym");
require("./lib/webfonts");
var { COLORS } = require("./lib/helpers");

// Global config
// var COLOR_BINS = [-4, -2, 0, 2, 4, 6, 8, 10];

var COLOR_BINS = [
  '6 weeks',
  '20 weeks',
  '22 weeks',
  '24 weeks',
  'Viability',
  'Third trimester',
  'None',
]
var COLOR_RANGE = [
  COLORS.teal5,
  COLORS.teal5,
  COLORS.teal5,
  COLORS.teal5,
  COLORS.teal5,
  COLORS.teal5,
  // COLORS.teal1,
  '#ccc'
  // "#e68c31",
  // "#eba934",
  // "#efc637",
  // "#c6b550",
  // "#99a363",
  // "#6a9171",
  // "#17807e",
];

// Global vars
var pymChild = null;

var renderBlockHistogram = require("./renderBlockHistogram");

// Initialize the graphic.
var onWindowLoaded = function() {
  var binned = formatData(window.DATA);
  render(binned);

  var observer = new IntersectionObserver(intersectionCallback, {threshold: 1});
  var target = document.querySelector(".target");
  observer.observe(target);
  function intersectionCallback(entries, observer){
    entries.forEach(entry=> {
      if(entry.isIntersecting){
        entry.target.classList.add("active");
      }
    })
  }


  window.addEventListener("resize", () => render(binned));

  pym.then(child => {
    pymChild = child;
    pymChild.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function(data) {
  var numBins = COLOR_BINS.length;
  var binnedData = [];

  // init the bins
  for (var i = 0; i < numBins; i++) {
    binnedData[i] = [];
  }

  // put states in bins
  data.forEach(function(d) {
    if (d.amt != null) {
      var state = d.usps;
      // if (d.based_on_pain) {
      //   state += "*"
      // }

      for (var i = 0; i < numBins; i++) {
        if (d.amt.substring(0,COLOR_BINS[i].length) == COLOR_BINS[i]) {
          binnedData[i].unshift({
            state: state,
            based_on_pain: d.based_on_pain
          });
          break;
        }
      }
    }
  });
  // console.log(binnedData)
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
    valueColumn: "amt"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
