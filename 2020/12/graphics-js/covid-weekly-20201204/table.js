var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var $ = require("./lib/qsa");
var { isMobile } = require("./lib/breakpoints");

var { getTimeStamp, arrayToObject, getData, updateTime } = require("./util");

var { fmtComma, getAPMonth } = require("./lib/helpers");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-scale/dist/d3-scale.min"),
};

// console.clear();

var onWindowLoaded = async function() {
  var jhu = await getData("json");
  var { data, updated } = jhu;
  if (updated) {
    var timestamp = getTimeStamp(updated);
    updateTime(timestamp);
  }

  updateTable(data);

  pym.then(child => {
    child.sendHeight();

    window.addEventListener("resize", () => child.sendHeight());
  });
};

var updateTable = function(data) {

  var us = {
    confirmed: 0,
    deaths: 0
  }

  // Extract categories from data
  var categories = [];

  if (LABELS.change_legend_labels && LABELS.change_legend_labels !== "") {
    // If custom legend labels are specified
    categories = LABELS.change_legend_labels.split("|").map(l => l.trim());

    categories.forEach(function(d,i) {
      categories[i] = Number(categories[i]);
    });

  // Create legend
  var legendWrapper = d3.select(".key-wrap");
  
  var legendElement = d3.select(".key");
  legendElement.html('');

    legendWrapper.classed("numeric-scale", true);

    // via https://gka.github.io/palettes/#/7|d|df6222,ed9d5e,ebe3a7|a7eecd,277273|1|1
    var colorScale = d3
      // .scaleThreshold()
      .scaleLinear()
      .domain(categories)
      .range([
        // "#000", // never used
        '#549990',
        '#7dc3ae',
        '#ebe3a7',
        '#eeb97a',
        '#ea8e4f',
        '#df6222'
      ]);

  colorScale.domain().forEach(function(key, i) {
    var keyItem = legendElement.append("li").classed("key-item", true);

    keyItem.append("b").style("background", colorScale(key));

    var keyLabel = key + "%";
    if (key > 0) {
      keyLabel = "+" + keyLabel;
    }

    keyItem.append("label").text(keyLabel);

    // Add the optional upper bound label on numeric scale
    if (i == categories.length - 1) {
      if (LABELS.change_max_label && LABELS.change_max_label !== "") {
        keyItem
          .append("label")
          .attr("class", "end-label")
          .text(LABELS.change_max_label);
      }
    }
  });
}

  // Add in tooltip for individual day data on heatmap.
  var tooltip = d3
    .select("#state-table")
    .append("div")
    .attr("id", "state-tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "#fff")
    .text("");
  var mainTooltipLabel = tooltip.append("div").attr("class", "label main");
  var secondaryTooltipLabel = tooltip
    .append("div")
    .attr("class", "label secondary cases");
  var deathsTooltipLabel = tooltip
    .append("div")
    .attr("class", "label secondary deaths");

  data.forEach(function(item) {

    var { state } = item;
    var confirmedElement = $.one(`[data-confirmed="${state}"]`);  
    var deathsElement = $.one(`[data-deaths="${state}"]`);
    if (!confirmedElement) {
      return console.log(`No element for ${state}`);
    }

    var deaths = item.deaths_override || item.deaths || 0;
    var confirmed = item.confirmed_override || item.confirmed || 0;

    us.deaths += deaths;
    us.confirmed += confirmed;

    confirmedElement.innerHTML = fmtComma(confirmed);
    confirmedElement.dataset.count = confirmed;
    deathsElement.innerHTML = fmtComma(deaths);
    deathsElement.dataset.count = confirmed;

  });

  // Add in listeners to update the tooltips.
  d3.selectAll(".sub-cell.cases")
    .on("mouseover", function displayTooltip() {
      var cases = this.dataset.cases;
      var days =  this.dataset.days;
      var date = new Date(LABELS.dateUpdated)
      date.setDate(date.getDate() - days);
      
      tooltip.style("left", this.offsetLeft + "px");
      tooltip.style("top", this.offsetTop + 32 + "px");

      deathsTooltipLabel.text(fmtComma(Number(cases)) + " new cases");
      secondaryTooltipLabel.text(getAPMonth(date) + " " + date.getDate());

      return tooltip.style("visibility", "");
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

  // set us totals
  if (us.confirmed > 180000) {
    $.one(`[data-confirmed="United States"]`).innerHTML = fmtComma(us.confirmed);  
  }
  
  if (us.deaths > 4000) {
    $.one(`[data-deaths="United States"]`).innerHTML = fmtComma(us.deaths);  
  }
  
  // turn on cell visibility
  $(".cell.confirmed, .cell.deaths").forEach(d => d.classList.add("show"));
};

//Initially load the graphic
window.onload = onWindowLoaded;
