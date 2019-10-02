var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// build our custom D3 object
var d3 = {
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-scale-chromatic/dist/d3-scale-chromatic.min")
};

var { COLORS, classify } = require("./lib/helpers");
var $ = require("./lib/qsa");

// Global vars
var pymChild = null;

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(function(child) {
    pymChild = child;
    pymChild.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

// Format graphic data.
var formatData = function() {
  if (!LABELS.show_territories) {
    var territories = [
      "Puerto Rico",
      "U.S. Virgin Islands",
      "Guam",
      "Northern Mariana Islands",
      "American Samoa"
    ];

    DATA = DATA.filter(d => territories.indexOf(d.state_name) == -1);
  }
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  isNumeric = LABELS.isNumeric;

  // Render the map!
  var container = "#state-grid-map";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderStateGridMap({
    container,
    width,
    data: DATA,
    // isNumeric will style the legend as a numeric scale
    isNumeric
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a state grid map.
var renderStateGridMap = function(config) {
  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Copy map template
  var template = d3.select("#map-template");
  containerElement.html(template.html());

  console.clear();
  var min = Infinity;
  var max = -Infinity;
  config.data.forEach(function(d) {
    d.change = (1 - (d.deaths_2018 / d.deaths_2017)) * -1;
    if (d.change < min) min = d.change;
    if (d.change > max) max = d.change;
    d.state = window.STATES.filter(s => s.usps == d.state_name).pop().name;
  });

  // if (Math.abs(min) > max) {
  //   max = Math.abs(min);
  // } else {
  //   min = max * -1;
  // }

  // min = Math.floor(min * 10) / 10;
  // max = Math.ceil(max * 10) / 10;
  var scheme = d3.schemePuOr[5].slice();

  var d3Scale = d3.scaleOrdinal(scheme, [-.3, .2]);

  var colorScale = v => d3Scale(Math.floor(v * 10) / 10)

  var key = document.querySelector(".key-wrap");
  key.innerHTML = new Array(5).fill(0).map(function(_, i) {
    var v = (i - 3) / 10;
    return `
<div class="key-bucket" style="border-color: ${colorScale(v)}">
  ${(i - 3) * 10} to ${(i - 2) * 10}%
</div>
    `
  }).join("")

  // Select SVG element
  var chartElement = containerElement.select("svg");

  // resize map (needs to be explicitly set for IE11)
  chartElement.attr("width", config.width).attr("height", function() {
    var s = d3.select(this);
    var viewBox = s.attr("viewBox").split(" ");
    return Math.floor(
      (config.width * parseInt(viewBox[3])) / parseInt(viewBox[2])
    );
  });

  // Set state colors
  config.data.forEach(function(state) {
    var stateClass = "state-" + classify(state.state);

    chartElement
      .select("." + stateClass)
      .classed(`cat-${(Math.floor(state.change * 10)) + 3}`, true)
      .attr("fill", colorScale(state.change));
  });

  // Draw state labels
  chartElement
    .append("g")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .text(function(d) {
      var state = STATES.filter(s => s.usps == d.state_name).pop();
      return isMobile.matches ? state.usps : state.ap;
    })
    .attr("class", "label")
    .attr("fill", d => Math.abs(d.change) > .2 ? "white" : "black")
    .attr("x", function(d) {
      var className = `.state-${classify(d.state)}`;
      var tileBox = $.one(className).getBBox();

      return tileBox.x + tileBox.width * 0.52;
    })
    .attr("y", function(d) {
      var className = ".state-" + classify(d.state);
      var tileBox = $.one(className).getBBox();
      var textBox = this.getBBox();
      var textOffset = textBox.height / 2;

      if (isMobile.matches) {
        textOffset -= 1;
      }

      return tileBox.y + tileBox.height * 0.5 + textOffset;
    });
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
