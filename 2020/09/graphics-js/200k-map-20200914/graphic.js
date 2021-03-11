var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");

// DATA
// geo data
// var geo_data_pre = require("./assets/worked/states_topo_joined.json");
// var geo_data = require("./assets/worked/states_filtered.json");

var { COLORS, wrapText, fmtComma } = require("./lib/helpers");
var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-fetch/dist/d3-fetch.min"),
};

// Constants
var colorScheme = [
  COLORS.blue1,
  COLORS.blue2,
  COLORS.blue3,
  COLORS.blue4,
  COLORS.blue5,
].reverse();
var mainProperty = "sviOverallPercentileRank";
var pymChild;

//Initialize graphic
var onWindowLoaded = function () {

  render();
  setTimeout(timerRunner, 2000);
  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    // var graphs = $.one('.hidden-maps');
    // graphs.classList.add('collapsed');

    // var toggleButton = $.one('.toggle-graphs');
    // toggleButton.addEventListener('click', function () {
    //   graphs.classList.toggle('collapsed');
    // //   child.sendHeight();

    //   if (graphs.classList.contains('collapsed')) {
    //     toggleButton.textContent = toggleButton.dataset.more;
    //     child.scrollParentToChildEl(graphs.id);
    //   } else {
    //     toggleButton.textContent = toggleButton.dataset.less;
    //   }
    // });
  });
};

var render = function () {
  var container = "#map-container";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var timerRunner = function() {
    switchDisplay()
    setTimeout(timerRunner, 2000);
}

var switchDisplay = function() {
  var before = true;
  if (d3.selectAll(`.map.after`)
    .classed('hidden')) {
    before = false;
  }
  d3.selectAll(`.map.before`)
    .classed('hidden', !before);
  d3.selectAll(`.map.after`)
    .classed('hidden', before);
}

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
