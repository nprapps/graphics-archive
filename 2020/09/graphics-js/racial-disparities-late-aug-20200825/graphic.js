var pym = require("./lib/pym");
require("./lib/webfonts");

// build our custom D3 object
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle, wrapText } = require("./lib/helpers");

var pctColorRamp = ['#df6222','#e99554','#edc485','#aac4c4','#779090'].reverse();

// console.log(pctColorRamp)
// console.log(pctColorRamp.reverse())
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");

var renderBar = require("./renderBar");
var renderReportedBar = require("./renderReportedBar");

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
  isNumeric = LABELS.is_numeric;

  // Render the maps

  CONTAINERS.forEach(function(container){
    // console.log(container)

    var element = document.querySelector(container);
    var width = element.offsetWidth;
    var containerElement = d3.select(container);
    containerElement.html("");

    var numMaps = MAPS.length / 2;
    var gutterWidth = 22;
    var graphicWidth = width;

    MAPS.filter(d => `#state-grid-map-${d.type}` == container).forEach((item, i) => {
      containerElement.append("div")
        .attr("class", "map " + classify(item.name_short));

      renderStateGridMap({
        container: ".map." + classify(item.name_short),
        width: graphicWidth,
        data: DATA,
        category: item.name_short,
        title: item.name_long,
        footnote: item.footnote,
        legendLabels: LABELS.legend_labels,
        // isNumeric will style the legend as a numeric scale
        isNumeric
      });

    });
  })

  // Render dropdown
  ALLSTATES = DATA.map(d => d.state_name);
  ALLSTATES.unshift("Select a State");

  var stateDropdown = d3.select("#dropdown");

  stateDropdown
    .selectAll("option")
    .data(ALLSTATES)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

  stateDropdown.on("change", function() {
    var selection = document.getElementById("dropdown");
    selectedState = selection.options[selection.selectedIndex].value;
    renderDrop(selectedState);
  });

  var renderDrop = function(selectedState) {
    if (selectedState != "") {
      BAR_CONTAINERS.forEach(function(container) {
        var element = document.querySelector(container);
        var width = element.offsetWidth;
        var containerElement = d3.select(container);
        containerElement.html("");

        var numMaps = BARS.length / 2;
        var gutterWidth = 22;
        var graphicWidth = width;

        BARS.filter(d => `#bar-${d.type}` == container).forEach((item, i) => {
          // containerElement.append("div")
          //   .attr("class", "bar " + classify(item.name_long));

          renderBar({
            container: "#bar-" + item.type,
            width: graphicWidth,
            category: item.name_short,
            title: item.name_long,
            type: item.type,
            pctColorRamp:pctColorRamp,
            legendLabels: LABELS.legend_labels,
            metrics: BARS.filter(d => d.type != item.type).map(d => d.name_short),
            data: LOOKUP_DATA.filter(d => d.state_name == selectedState)
          });
          
          renderReportedBar({
            container: "#reported-bar-chart",
            width,
            title: item.name_long,
            type: item.type,
            metrics: BARS.filter(d => d.denominator != item.denominator).map(d => d.name_short),
            data: REPORTED_DATA.filter(d => d.state_name == selectedState)
          });
        });
      })

    }
    // Update iframe
      if (pymChild) {
        pymChild.sendHeight();
      }
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a state grid map.
var renderStateGridMap = function(config) {
  var valueColumn = config.category;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Copy map template
  var template = d3.select("#map-template");
  containerElement.html(template.html());



  // Extract categories from data
  var categories = [];
  if (config.legendLabels && config.legendLabels !== "") {
    // If custom legend labels are specified
    categories = config.legendLabels.split("|").map(l => +l.trim());

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

  if (config.title) {
    legendWrapper.insert("h3",".key")
      .text(config.title);
  }

  var legendElement = containerElement.select(".key");

  if (config.isNumeric) {
    legendWrapper.classed("numeric-scale", true);

    var colorScale = d3
      .scaleThreshold()
      .domain(categories)
      .range(
        // ['#df6222', '#eda464', '#ebe3a7', COLORS.teal6].reverse()
        // ['#df6222', '#e78444', '#eda464', '#eec385', '#ebe3a7', COLORS.teal6].reverse()
        pctColorRamp
      );

  } else {
    // Define color scale
    var colorScaleRange = [
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ];
    // if (config.colors) {
    //   colorScaleRange = config.colors;
    // }
    var colorScale = d3
      .scaleOrdinal()
      .domain(categories)
      .range(colorScaleRange);
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
    if (state[valueColumn] !== null && state[valueColumn] !== undefined) {
      var stateClass = "state-" + classify(state.state_name);
      var categoryClass = "category-" + state[valueColumn];


      chartElement
        .select("." + stateClass)
        .attr("class", stateClass + " state-active " + categoryClass)
        .attr("fill", colorScale(state[valueColumn]));
    }
  });

  // Draw state labels
  chartElement
    .append("g")
    .selectAll(".label")
    .data(config.data)
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .text(function(d) {
      var state = STATES.filter(s => s.name == d.state_name).pop();
      // return isMobile.matches ? state.usps : state.ap;
      return state.usps;
    })
    .attr("class", d => `s-${d.state_name} label label-active`)
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

      // if (isMobile.matches) {
        textOffset -= 1;
      // }

      return tileBox.y + tileBox.height * 0.5 + textOffset;
    });

  // chartElement
  //   .append("g")
  //   .selectAll(".label")
  //   .data(config.data)
  //   .enter()
  //   .append("text")

  if (config.footnote) {
    containerElement.append("div")
      .attr("class", "footnotes")
      .append("p")
        .html(config.footnote);
  }
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
