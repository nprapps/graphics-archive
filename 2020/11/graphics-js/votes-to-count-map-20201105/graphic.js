var pym = require("./lib/pym");
require("./lib/webfonts");

// import textures from 'textures';

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
  var votes_in = "votes_in";

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

    if (config.isNumeric) {
      categories.forEach(function(d,i) {
        categories[i] = Number(categories[i]);
      });
    }
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
      .scaleThreshold()
      .domain(categories)
      // .range([
      //   COLORS.blue1,
      //   COLORS.blue3,
      //   "#888",
      //   "#888",
      //   COLORS.red3,
      //   COLORS.red1
      // ])
      .range([
        COLORS.blue1,
        "#237bbd",
        "#888",
        "#888",
        "#d61f21",
        COLORS.red1
      ]);
      // .range([
      //   COLORS.blue1,
      //   "#666",
      //   "#666",
      //   "#666",
      //   "#666",
      //   COLORS.red1
      // ]);
  } else {
    // Define color scale
    var colorScale = d3
      .scaleOrdinal()
      .domain(categories)
      .range([
        COLORS.blue1,
        COLORS.blue3,
        COLORS.blue5,
        COLORS.red5,
        COLORS.red3,
        COLORS.red1
      ]);
  }

  colorScale.domain().forEach(function(key, i) {
    var keyItem = legendElement.append("li").classed("key-item", true);

    keyItem.append("b").style("background", colorScale(key));

    keyItem.append("label").text(key);

  //   // Add the optional upper bound label on numeric scale
    if (config.isNumeric && i == categories.length - 1) {
      if (LABELS.max_label && LABELS.max_label !== "") {
        keyItem
          .append("label")
          .attr("class", "end-label")
          // .text(LABELS.max_label);
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

  // SVGs with texture
  const texture_both = textures.lines()
  .orientation("diagonal")
  .size(20)
  .strokeWidth(7)
  .stroke("#d61f21")
  .background("#237bbd");

  const texture_dem = textures.lines()
  .orientation("diagonal")
  .size(20)
  .strokeWidth(7)
  .stroke("#237bbd")
  .background("#CCCCCC");

  const texture_gop = textures.lines()
  .orientation("diagonal")
  .size(20)
  .strokeWidth(7)
  .stroke("#d61f21")
  .background("#CCCCCC");

  chartElement.call(texture_both);
  chartElement.call(texture_gop);
  chartElement.call(texture_dem);

  // Set state colors
  config.data.forEach(function(state) {
    if (state[valueColumn] !== null && state[valueColumn] !== undefined 
      && state[votes_in] !== null && state[votes_in] !== undefined) {
      var stateClass = "state-" + classify(state.state_name);
      var categoryClass = "category-" + classify(state[valueColumn] + "");
      var circle_clip = ""
      switch(state[votes_in]) {
        case 1:
          circle_clip = "clip-twenty-five";
          break;
        case 2:
          circle_clip = "clip-fifty";
          break;
        case 3:
          circle_clip = "clip-seventy-five";
          break;
        case 4:
          circle_clip = "clip-ninenine";
          break;
        case 5:
          circle_clip = "clip-hundred";
          break;
        // if its zero dont assign any class (it will remain not filled in all the way)
        default:
          circle_clip = "";
      }

      chartElement
        .select("." + stateClass)
        .attr("class", `${ stateClass } ${ categoryClass } ${ circle_clip } state-active`)
        .attr("fill", function(d){
          if((state.state_name == "Maine" || state.state_name == "Nebraska")) {
            if(state.category == 5) {
              return texture_both.url()
            }
            else if(state.category == 6) {
              return texture_dem.url()
            }
            else if(state.category == 7) {
              return texture_gop.url()
            }
          }
          return colorScale(state[valueColumn])
        })
        .attr("opacity", state[valueColumn] == 2  || state[valueColumn] == 3 ? 1 : .8);
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
    .attr("class", d =>
      (d[valueColumn] !== null && d[valueColumn] !== undefined)
        ? `category-${classify(d[valueColumn] + "")} label label-active`
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

      if (isMobile.matches) {
        textOffset -= 1;
      }

      return tileBox.y + tileBox.height * 0.5 + textOffset;
    });
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
