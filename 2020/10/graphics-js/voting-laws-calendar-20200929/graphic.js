var $ = require("./lib/qsa");
var pym = require("./lib/pym");
require("./lib/webfonts");

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
var maps = [ "mail-ballots", "mail-applications", "absentee-noexcuse", "absentee-excuse" ];

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(function(child) {
    pymChild = child;
    pymChild.sendHeight();
  });
  // handle the lookup
  var stateSelector = document.querySelector("#state-spotlight");

  var onStateSelected = function(evt) {
      

    if (evt.target.value) {

      // create custom tables for states
      document.querySelector(".info.active").classList.remove("active");
      document.querySelector("#lookup-result .info." + evt.target.value).classList.add("active");

      // create custom tables for headers
      document.querySelector(".header.active").classList.remove("active");
      document.querySelector("#lookup-result .header." + evt.target.value).classList.add("active");

      document.querySelector(".calendar.active").classList.remove("active");
      document.querySelector("#lookup-result .calendar." + evt.target.value).classList.add("active");

      var activesOld = document.querySelectorAll(".map .active");
      activesOld.forEach(function(a) {
        a.classList.remove("active");
      })

      var activesNew = document.querySelectorAll(".map path.state-" + evt.target.value);
      activesNew.forEach(function(a) {
        a.classList.add("active");
      })

      // commented out was making the outlines not show up
      // pymChild.sendHeight();
    
      d3.selectAll(".map .active").moveToFront();
    }
  }

  stateSelector.addEventListener("change", onStateSelected);
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
  maps.forEach((map, i) => {
    var container = "#" + map;
    var element = document.querySelector(container);
    var width = element.offsetWidth;

    var valueColumn = map.replace("-", "_");

    renderStateGridMap({
      container,
      width,
      data: DATA,
      valueColumn: valueColumn,
      // isNumeric will style the legend as a numeric scale
      isNumeric,
      id: map
    });
  });

  // unify header heights
  if (!isMobile.matches) {
    var labelHeds = d3.selectAll('.map h4');
    var labelMaxHeight = 0;

    labelHeds["_groups"][0].forEach(function(d,i) {
        var thisHeight = d.getBoundingClientRect().height;
        if (thisHeight > labelMaxHeight) {
            labelMaxHeight = thisHeight;
        }
    });

    labelHeds.style('height', labelMaxHeight + 'px');
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a state grid map.
var renderStateGridMap = function(config) {
  var valueColumn = config.valueColumn ? config.valueColumn : "category";

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
        COLORS.teal3,
        COLORS.orange4,
        COLORS.teal5
      ]);
  }

  colorScale.domain().forEach(function(key, i) {
    var keyItem = legendElement.append("li");
    keyItem.attr("class", "key-item key-" + i);

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
    if (state[valueColumn] !== null && state[valueColumn] !== undefined && state[valueColumn] !== "") {
      var stateClass = "state-" + classify(state.state_name);
      var categoryClass = "category-" + classify(state[valueColumn] + "");

      chartElement
        .select("." + stateClass)
        .attr("class", `${ stateClass } ${ categoryClass } state-active`)
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
      // return isMobile.matches ? state.usps : state.ap;

      var suffix = "";
      if ((config.id == "mail-ballots" && state.usps == "AZ") || (config.id == "absentee-noexcuse" && state.usps == "MS") || (config.id == "absentee-noexcuse" && state.usps == "MO") || (config.id == "absentee-excuse" && state.usps == "MO")) {
        suffix = "*";
      }

      return state.usps + suffix;
    })
    .attr("class", d =>
      (d[valueColumn] !== null && d[valueColumn] !== undefined && d[valueColumn] != "")
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

      // if (isMobile.matches) {
        textOffset -= 1;
      // }

      return tileBox.y + tileBox.height * 0.5 + textOffset;
    });
};

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
  return this.each(function() {
    this.parentNode.appendChild(this);
  });
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
