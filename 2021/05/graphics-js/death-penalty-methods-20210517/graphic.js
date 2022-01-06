var pym = require("./lib/pym");
require("./lib/webfonts");
var textures = require("./lib/textures");

// build our custom D3 object
var d3 = {
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");
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

  // Render the map!
  var container = "#state-grid-map";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  var containerElement = d3.select(container);
  containerElement.html("");

  var numMaps = MAPS.length;
  var gutterWidth = 22;
  var graphicWidth = width;

  // var texture1 = textures
  //     .lines()
  //     .orientation("7/8")
  //     .size(20)
  //     .strokeWidth(5)
  //     .background('#E38D2C')
  //     .stroke('#ffffff63');

  //   containerElement.select("key-top").call(texture1);
  //   //return 

  // var alternativeLegend = document.querySelector(".key-item.alternative-method b")
  // alternativeLegend.style.fill = texture1.url()

  MAPS.forEach((item, i) => {

    containerElement.append("div")
      .attr("class", "map " + classify(item.name_short));

    var itemColors = item.colors.split(",");

    renderStateGridMap({
      container: ".map." + classify(item.name_short),
      width: graphicWidth,
      data: DATA,
      category: item.name_short,
      title: item.name_long,
      footnote: item.footnote,
      colors: itemColors,
      legendLabels: item.legend_labels,
      // isNumeric will style the legend as a numeric scale
      isNumeric
    });

  });


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
    categories = config.legendLabels.split("|").map(l => l.trim());
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

  // var texture1 = textures
  //       .lines()
  //       .orientation("7/8")
  //       .size(20)
  //       .strokeWidth(4)
  //       .background('black')
  //       .stroke('#ffffff4D');
    
  // containerElement.select("svg").call(texture1);

  // Create legend
  var legendWrapper = containerElement.select(".key-wrap");

  if (config.title) {
    legendWrapper.insert("h3",".key")
      .text(config.title);
  }

  //var legendElement = containerElement.select(".key");

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
    var colorScaleRange = [
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ];
    if (config.colors) {
      colorScaleRange = config.colors;
    }
    var colorScale = d3
      .scaleOrdinal()
      .domain(categories)
      .range(colorScaleRange);
  }

  // colorScale.domain().forEach(function(key, i) {
  //   var keyItem = legendElement.append("li").classed("key-item", true);

  //   keyItem.append("b").style("background", colorScale(key));

  //   keyItem.append("label").text(key);

  //   // Add the optional upper bound label on numeric scale
  //   if (config.isNumeric && i == categories.length - 1) {
  //     if (LABELS.max_label && LABELS.max_label !== "") {
  //       keyItem
  //         .append("label")
  //         .attr("class", "end-label")
  //         .text(LABELS.max_label);
  //     }
  //   }
  // });

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

  var noDeathPenaltyStates = ['New Hampshire']
  var moratoriaStates = ['California','Oregon','Pennsylvania']

  // Set state colors
  config.data.forEach(function(state) {
    if (state[valueColumn] !== null) {
      var stateClass = "state-" + classify(state.state_name);
      var categoryClass = "category-" + classify(state[valueColumn] + "");

      chartElement
        .select("." + stateClass)
        .attr("class", stateClass + " state-active " + categoryClass)
        .attr("fill", function(d){
          // if (config.category != 'lethal_injection'){
          //   if ((state[valueColumn] == 'Alternative method')){
          //     var texture1 = textures
          //       .lines()
          //       .orientation("7/8")
          //       .size(20)
          //       .strokeWidth(5)
          //       .background(colorScale(state[valueColumn]))
          //       .stroke('#ffffff63');

          //     containerElement.select("svg").call(texture1);
          //     return texture1.url()
          //   }
          //   else {
          //     return colorScale(state[valueColumn])
          //   }
            

          // }
          // else {
            return colorScale(state[valueColumn])
          //}

        });
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
      // return isMobile.matches ? state.usps : state.ap;

      if (noDeathPenaltyStates.includes(d.state_name)){
        return state.usps + "^"
      }
      else if (moratoriaStates.includes(d.state_name)){
        return state.usps + "*"
      }
      else {
        return state.usps;
      }
      
    })
    .attr("class", d =>
      d[valueColumn] !== null
        ? `category-${classify(d[valueColumn] + "")} label label-active state-${classify(d.state_name)}-${classify(config.category)}`
        : "label"
    )
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
