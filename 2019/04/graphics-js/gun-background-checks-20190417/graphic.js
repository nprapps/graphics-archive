var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// build our custom D3 object
var d3 = Object.assign({}, require("d3-scale"), require("d3-selection"));

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

    DATA = DATA.filter(function(d) {
      return territories.indexOf(d.state_name) == -1;
    });
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
  var valueColumn = "category";

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Copy map template
  var template = d3.select("#map-template");
  containerElement.html(template.html());

  // Extract categories from data
  var categories = [];

  if (LABELS.legend_labels && LABELS.legend_labels !== "") {
    // If custom legend labels are specified
    categories = LABELS.legend_labels.split("|").map(l => l.trim());
  } else {
    // Default: Return sorted array of categories
    config.data.forEach(function(state) {
      if (state[valueColumn] != null) {
        categories.push(state[valueColumn]);
      }
    });

    //dedupe
    categories = Array.from(new Set(categories)).sort();
  }

  // Create legend
  var legendWrapper = containerElement.select(".key-wrap");
  var legendElement = containerElement.select(".key");

  if (config.isNumeric) {
    legendWrapper.classed("numeric-scale", true);

    var colorScale = d3
      .scaleOrdinal()
      .domain(categories)
      .range([
        COLORS.teal6,
        COLORS.teal5,
        COLORS.teal4,
        COLORS.teal3,
        COLORS.teal2,
        COLORS.teal1
      ]);
  } else {
    // Define color scale
    var colorScale = d3
      .scaleOrdinal()
      .domain(categories)
      .range([
        COLORS.orange2,
        COLORS.orange5,
        COLORS.teal2,
        COLORS.teal5,
        "#d3d3d3"
      ]);
  }

  colorScale.domain().forEach(function(key, i) {
    var keyItem = legendElement.append("li").classed("key-item", true);

    keyItem.append("b").style("background", colorScale(key));

    keyItem.append("label").text(key);

    // Add the optional upper bound label on numeric scale
    if (config.isNumeric && i == categories.length - 1) {
      if (LABELS.max_label && LABELS.max_label !== "") {
        keyItem
          .append("label")
          .attr("class", "end-label")
          .text(LABELS.max_label);
      }
    }
  });

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
    if (state[valueColumn] !== null) {
      var stateClass = "state-" + classify(state.state_name);
      var categoryClass = "category-" + classify(state[valueColumn] + "");

      chartElement
        .select("." + stateClass)
        .attr("class", stateClass + " state-active " + categoryClass)
        .attr("fill", colorScale(state[valueColumn]));
    }
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
      var state = STATES.filter(s => s.name == d.state_name).pop();
      return isMobile.matches ? state.usps : state.ap;
    })
    .attr("class", function(d) {
      return d[valueColumn] !== null
        ? "category-" + classify(d[valueColumn] + "") + " label label-active"
        : "label";
    })
    .attr("x", function(d) {
      var className = `.state-${classify(d.state_name)}`;
      var tileBox = $.one(className).getBBox();

      return tileBox.x + tileBox.width * 0.52;
    })
    .attr("y", function(d) {
      var className = ".state-" + classify(d.state_name);
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
