var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

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
var colorScheme = ["#fff","#006837","#1a9850","#66bd63","#a6d96a","#d9ef8b","#fff298","#ffcd48"]



var mainProperty = "sviOverallPercentileRank";
var pymChild;

//Initialize graphic
var onWindowLoaded = function() {
  render();
  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

  });
};

var render = function() {
  var container = "#key-container";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  renderLegend(container);

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderLegend = function(container) {
  var containerElement = d3.select(container);

  var categories;
  if (COPY.legend_labels && COPY.legend_labels !== "") {
    // If custom legend labels are specified
    categories = COPY.legend_labels.split("|").map(l => Number(l.trim()));
  }

  // Create legend
  var legendWrapper = containerElement.select(".key-wrap");
  var legendElement = containerElement.select(".key");
  legendElement.html("");

  var colorScale;
  legendWrapper.classed("numeric-scale", true);

  var colorScale = d3
    .scaleThreshold()
    .domain(categories)
    .range(colorScheme);

  colorScale.domain().forEach(function(key, i) {
    var keyItem = legendElement.append("li").classed("key-item", true);

    keyItem.append("b").style("background", colorScale(key));

    var keyVal = Number(key);

    if (i === 0) {
      keyItem.append("label").text(COPY.min_label);
    } 
    // else if (i === 1) {
    //   keyItem.append("label").text("< -15%");
    // } 
    // else if (i === categories.length - 1) {
    //   keyItem.append("label").text("> 0%");
    // } 
    else {
      keyItem.append("label").text(fmtComma(keyVal)+ "%");
    }

    if (i == 3) {
      keyItem.append("div")
          .attr("class","detail p1")
          .html("<div class='pointer'></div><div class='inner'><p>" + COPY.avg +"</p></div>")      
    }

    // Add the optional upper bound label on numeric scale
    if (i == categories.length - 1) {
      if (COPY.max_label) {
        keyItem
          .append("label")
          .attr("class", "end-label")
          .text(COPY.max_label);

        keyItem.append("div")
          .attr("class","detail p2")
          .html("<div class='pointer'></div><div class='inner'><p>" + COPY.onePct +"</p></div>")
      }
    }
  });
}

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
