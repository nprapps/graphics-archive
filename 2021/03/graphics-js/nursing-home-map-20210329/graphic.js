var pym = require("./lib/pym");
require("./lib/webfonts");

// build our custom D3 object
var d3 = {
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
};

var { COLORS, classify, fmtComma } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");

// Global vars
var pymChild = null;
var maxTooltipWidth = 200;

// Initialize the graphic.
var onWindowLoaded = function () {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(function (child) {
    pymChild = child;
    pymChild.sendHeight();
  });
};

// Format graphic data.
var formatData = function () {
  if (!LABELS.show_territories) {
    var territories = [
      "Puerto Rico",
      "U.S. Virgin Islands",
      "Guam",
      "Northern Mariana Islands",
      "American Samoa",
    ];

    DATA = DATA.filter(d => territories.indexOf(d.state_name) == -1);
  }
};

function mouseEnterFunction() {
  if (isMobile.matches) return;
  this.parentElement.appendChild(this);
  var class_name = this.className.baseVal.replace("state-", "");

  var state_check = class_name.split(" ")[0].replace("-", " ");
  if (state_check == 'west virginia') return;
  var data = window.DATA.filter(d => d.state_name.toLowerCase() == state_check);

  var { state_name, second_dose, category } = data[0];
  var mode = Number(this.dataset.per) >= 40 ? 'dark' : 'light'

  var fill = this.getAttribute('fill');

  tooltip.innerHTML = `
            <div class="tooltip-label"><h3>${state_name}</h3></div>
            <div class="tooltip-label number both">Percent vaccinated: <span style="background-color: ${fill};" class="pill ${mode}"><strong>${
              (category * 100).toFixed(0)
            }%</strong></span></div>
            <div class="tooltip-label number one">Number vaccinated: <span id="dose">${fmtComma(
              second_dose
            )}</span></div>`;
}

function mouseMoveFunction(e) {
  if (isMobile.matches) return;
  var { clientX, clientY } = e;

  var class_name = this.className.baseVal.replace("state-", "");

  var state_check = class_name.split(" ")[0].replace("-", " ");
  if (state_check == 'west virginia') return;
  var bodyPos = document.querySelector("body").getBoundingClientRect();
  var mapPos = $.one("svg").getBoundingClientRect();
  var offsetX = (bodyPos.width - mapPos.width) / 2;
  var statePos = this.getBoundingClientRect();
  tooltip.style.top = statePos.top - 50 + "px";
  if (statePos.bottom > mapPos.bottom - 120) {
    tooltip.style.top = statePos.top - 210 + "px";
  }
  //var element = tooltip.node();
  var tooltipLeft = statePos.left + statePos.width / 2 - offsetX;
  if (tooltipLeft >= mapPos.right - offsetX - maxTooltipWidth) {
    tooltipLeft = tooltipLeft - maxTooltipWidth;
  }
  tooltip.style.left = tooltipLeft + "px";
  tooltip.style.display = "block";
}

function mouseOutFunction() {
  tooltip.style.display = "none";
}

// Render the graphic(s). Called by pym with the container width.
var render = function () {
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
    isNumeric,
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a state grid map.
var renderStateGridMap = function (config) {
  var valueColumn = "category";

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Copy map template
  var template = d3.select("#map-template");
  containerElement.html(template.html());

  $(".states path").forEach(el => {
    el.addEventListener("mouseover", mouseEnterFunction);
    el.addEventListener("mousemove", mouseMoveFunction);
    el.addEventListener("mouseout", mouseOutFunction);
  });

  tooltip = $.one(".tooltip");

  // Extract categories from data
  var categories = [];

  if (LABELS.legend_labels && LABELS.legend_labels !== "") {
    // If custom legend labels are specified
    categories = LABELS.legend_labels.split("|").map(l => l.trim());

    if (config.isNumeric) {
      categories.forEach(function (d, i) {
        categories[i] = Number(categories[i]);
      });
    }
  } else {
    // Default: Return sorted array of categories
    config.data.forEach(function (state) {
      if (state[valueColumn] != null) {
        categories.push(state[valueColumn]);
      }
    });

    //dedupe
    categories = Array.from(new Set(categories)).sort();
  }

  // Create legend

  var colorScale = d3
    .scaleLinear()
    .domain([0, 16, 32, 48, 64, 80 ])
    .range([
      COLORS.blue6,
      COLORS.blue5,
      COLORS.blue4,
      COLORS.blue3,
      COLORS.blue2,
      COLORS.blue1,
    ]);

  // Select SVG element
  var chartElement = containerElement.select("svg");

  // resize map (needs to be explicitly set for IE11)
  chartElement.attr("width", config.width).attr("height", function () {
    var s = d3.select(this);
    var viewBox = s.attr("viewBox").split(" ");
    return Math.floor(
      (config.width * parseInt(viewBox[3])) / parseInt(viewBox[2])
    );
  });

  // Set state colors
  config.data.forEach(function (state) {
    if (state[valueColumn] !== null && state[valueColumn] !== undefined) {
      var stateClass = "state-" + classify(state.state_name);
      var categoryClass = "category-" + classify(state[valueColumn] + "");

      chartElement
        .select("." + stateClass)
        .attr("class", `${stateClass} ${categoryClass} state-active`)
        .attr("fill", colorScale(state[valueColumn] * 100))
        .attr("data-per", state[valueColumn] * 100);
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
    .text(function (d) {
      var state = STATES.filter(s => s.name == d.state_name).pop();
      return isMobile.matches ? state.usps : state.ap;
    })
    .attr("class", d =>
      d[valueColumn] !== null && d[valueColumn] !== undefined
        ? `category-${classify(d[valueColumn] + "")} label label-active`
        : "label"
    )
    .attr("x", function (d) {
      var className = `.state-${classify(d.state_name)}`;
      var tileBox = $.one(className).getBBox();

      return tileBox.x + tileBox.width * 0.52;
    })
    .attr("y", function (d) {
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
