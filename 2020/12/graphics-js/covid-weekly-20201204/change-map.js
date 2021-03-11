var pym = require("./lib/pym");
require("./lib/webfonts");

// build our custom D3 object
var d3 = {
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, fmtComma } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");

console.clear();

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
  if (!LABELS.change_show_territories) {
    var territories = [
      "Puerto Rico",
      "Virgin Islands",
      "Guam",
      "Northern Mariana Islands",
      "American Samoa"
    ];

    DATA = DATA.filter(d => territories.indexOf(d.state_name) == -1);
  }

  // remove states that don't have hexes
  DATA = DATA.filter(d => $.one(".state-" + classify(d.state_name)));
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  var wrapperElement = document.querySelector(".map-wrapper");

  // Render the map!
  // [ "risk", "recent" ].forEach((map, i) => {
  [ "risk" ].forEach((map, i) => {
    var container = "#" + map;
    var width = wrapperElement.offsetWidth;
    var showKey = false;

    switch(map) {
      case "risk":
        isNumeric = false;
        showKey = false;
        break;
      case "recent":
        isNumeric = LABELS.change_is_numeric;
        showKey = true;
        break;
    }

    renderStateGridMap({
      container,
      width,
      data: DATA,
      // isNumeric will style the legend as a numeric scale
      isNumeric,
      map,
      showKey
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a state grid map.
var renderStateGridMap = function(config) {
  var valueColumn = "daily_cases_pct_difference";
  var legendHed = LABELS.change_legend_head;
  var legendLabels = LABELS.change_legend_labels;
  var keyPrefix = "+";
  var keySuffix = "%";
  if (config.map == "risk") {
    valueColumn = "risk_level";
    legendHed = LABELS.change_legend_head_risk;
    legendLabels = LABELS.change_legend_labels_risk;
    keyPrefix = "";
    keySuffix = "";
  }

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Copy map template
  var template = d3.select("#map-template");
  containerElement.html(template.html());

  // Extract categories from data
  var categories = [];

  if (legendLabels && legendLabels !== "") {
    // If custom legend labels are specified
    categories = legendLabels.split("|").map(l => l.trim());

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

  // define color scale
  switch(config.map) {
    case "risk":
      var colorScale = d3
        .scaleOrdinal()
        .domain(categories)
        .range([
          // '#7dc3ae',
          // '#ebe3a7',
          // '#eeb97a',
          // '#df6222'
          "#51A09E",
          "#EFC637",
          "#E38D2C",
          "#A23520"
        ]);
      break;
    case "recent":
      // via https://gka.github.io/palettes/#/7|d|df6222,ed9d5e,ebe3a7|a7eecd,277273|1|1
      var colorScale = d3
        .scaleThreshold()
        // .scaleLinear()
        .domain(categories)
        .range([
          "#000", // never used
          '#549990',
          '#7dc3ae',
          '#ebe3a7',
          '#eeb97a',
          '#ea8e4f',
          '#df6222'
        ]);
      break;
  }

  // Create legend
  if (config.showKey) {
    var legendWrapper = containerElement.select(".key-wrap");
    var legendElement = containerElement.select(".key");

    legendWrapper.select("h3")
      .html(legendHed);

    if (config.map == "recent") {
      legendWrapper.classed("numeric-scale", true);
    }

    colorScale.domain().forEach(function(key, i) {
      var keyItem = legendElement.append("li").classed("key-item", true);

      keyItem.append("b").style("background", colorScale(key));

      var keyLabel = key + keySuffix;
      if (key > 0) {
        keyLabel = keyPrefix + keyLabel;
      }

      keyItem.append("label").text(keyLabel);

      // Add the optional upper bound label on numeric scale
      if (config.isNumeric && i == categories.length - 1) {
        if (LABELS.change_max_label && LABELS.change_max_label !== "") {
          keyItem
            .append("label")
            .attr("class", "end-label")
            .text(LABELS.change_max_label);
        }
      }
    });
  }

  // set up tooltips
  var maxTooltipWidth = 200;
  var tooltip = containerElement
    .append('div')
    .attr('id', 'state-tooltip')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('visibility', 'hidden')
    .style('background', '#fff')
    .text('');
  var mainTooltipLabel = tooltip.append('div').attr('class', 'tooltip-label main');
  var tooltipTable = tooltip.append('table').attr('class', 'tooltip-table');
  var tBody = tooltipTable.append('tbody');

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
    // special-case MA
    if (state[valueColumn] !== null && state[valueColumn] !== undefined) {
      var stateClass = "state-" + classify(state.state_name);

      // accounting for a quirk of D3 linear scales where a number that
      // exceeds the specified domain won't clip to the last specified color value.
      var largestCategoryValue = colorScale.domain()[colorScale.domain().length - 1];
      var colorValue = state[valueColumn] > largestCategoryValue ? largestCategoryValue : state[valueColumn];
      if (config.map == "risk") {
        colorValue = state[valueColumn];
      }

      var colorValueIndex = colorScale.range().indexOf(colorScale(colorValue));
      var categoryClass = "category-" + colorValueIndex;

      chartElement
        .select("." + stateClass)
        .attr("class", `${ stateClass } ${ categoryClass } state-active`)
        .attr("fill", colorScale(colorValue))
        .on('mouseover', function() {
          // Don't do tooltips on mobile.
          if (isMobile.matches) {
            return;
          }

          d3.select(this).classed("active", true);
          d3.select(this).moveToFront();

          mainTooltipLabel.text(state.state_name);
          tBody.text('');

          var matrix = [
            {
              label: 'Risk level',
              total: state.risk_level
            },
            {
              label: 'Avg. daily cases',
              total: fmtComma(state.daily_cases_this_week) + '/day'
            },
            {
              label: 'Per 100k',
              per: state.daily_cases_per_100k + ' per 100k'
            }
          ];

          var tr = tBody.selectAll('tr').data(matrix).enter().append('tr');
          var td = tr
            .selectAll('td')
            .data(function (d, i) {
              return Object.values(d);
            })
            .enter()
              .append('td')
              .classed("amt", ( d, i ) => i == 1 ? true : false)
              .html(d => d);

          // Set tooltip positions. If tooltip goes too far to the right, move to lefthand side of state.
          // I don't know why this works. Change at your peril.
          var bodyPos = document.querySelector("body").getBoundingClientRect();
          var mapPos = document.querySelector(config.container + " svg").getBoundingClientRect();
          var offsetX = (bodyPos.width - mapPos.width) / 2;

          // console.log(bodyPos);

          var statePos = this.getBoundingClientRect();
          tooltip.style('top', (statePos.top - 15) + 'px');

          var element = tooltip.node();
          var tooltipWidth = element.getBoundingClientRect().width;
          var tooltipLeft = statePos.left + (statePos.width / 2) - offsetX;
          // console.log(tooltipLeft, (tooltipLeft + maxTooltipWidth), (mapPos.right - offsetX - maxTooltipWidth));
          if (tooltipLeft >= (mapPos.right - offsetX - maxTooltipWidth)) {
            // console.log("too wide")
            tooltipLeft = tooltipLeft - maxTooltipWidth;
          }
          tooltip.style('left', tooltipLeft + 'px');

          return tooltip.style('visibility', 'visible');
        })
        .on('mouseout', function () {
          d3.select(this).classed("active", false);
          return tooltip.style('visibility', 'hidden');
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
      // var suffix = d.state_name == "Massachusetts" ? "*" : "";
      // return isMobile.matches ? (state.usps + suffix) : (state.ap + suffix);
      return isMobile.matches ? state.usps : state.ap;
    })
    .attr("class", function(d) {
      // special=case MA
      if (d[valueColumn] !== null && d[valueColumn] !== undefined) {
        var largestCategoryValue = colorScale.domain()[colorScale.domain().length - 1];
        var colorValue = d[valueColumn] > largestCategoryValue ? largestCategoryValue : d[valueColumn];
        var colorValueIndex = colorScale.range().indexOf(colorScale(colorValue));
        if (config.map == "risk") {
          colorValueIndex = d[valueColumn];
        }

        return `category-${ colorValueIndex } label label-active`;
      } else {
        return "label";
      }
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
