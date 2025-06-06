var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var ALLSTATES = require("./states.js");

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "now", "additional", "now_override",  "add_override", "needed",  "needed per cap", "total_percap",  "sufficient",  "footnote_1",  "footnote_2",  "footnote_3", "footnote_4"];
var skipData = ["label", "now", "additional", "now_override",  "add_override", "needed",  "needed per cap", "total_percap",  "sufficient",  "footnote_1",  "footnote_2",  "footnote_3", "footnote_4"];

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle, wrapText, fmtComma} = require("./lib/helpers");

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function() {
  TABLE.forEach(function(d) {
    var x0 = 0;

    d.values = [];

    for (var key in d) {
      if (skipData.indexOf(key) > -1) {
        continue;
      }

      var x1 = x0 + parseFloat(d[key]);

      d.values.push({
        name: key,
        x0: x0,
        x1: x1,
        val: d[key]
      });

      x0 = x1;
    }
  });
}

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  //table

  renderDrop("", container, width);

  ALLSTATES = TABLE.map(d => d.label);
  ALLSTATES.unshift("Select a State");

  var stateMenu = d3.select('#dropdown');

  stateMenu
    .selectAll("option")
    .data(ALLSTATES)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

  stateMenu.on("change", function() {
      var section = document.getElementById("dropdown");
      userData = section.options[section.selectedIndex].value;
      renderDrop(userData, container, width);
      });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }

}

var renderDrop = function(userData, container, width) {
    // handle user data
    var userDataMeasures = [];
    if (userData != "") {
        var matchUserDataRows = TABLE.filter(x=>x.label == userData)

        for (i in matchUserDataRows) {
          var matchRow = matchUserDataRows[i];
          var d = {};
          d['label'] = matchRow.label;
          d['now'] = matchRow.now_override || matchRow.now || "Not known";
          d['add'] = matchRow.add_override || matchRow.additional || "0";
          d['total_percap'] = matchRow.total_percap;
          d['needed'] = matchRow.needed;
          d['sufficient'] = matchRow.sufficient;
          d['footnote1'] = matchRow.footnote_1 || '';
          d['footnote2'] = matchRow.footnote_2 || '';
          d['footnote3'] = matchRow.footnote_3 || '';
          d['footnote4'] = matchRow.footnote_4 || '';


         userDataMeasures.push(d)

        }
        renderAutoText(userDataMeasures);

        renderStackedBarChart({
          container,
          width,
          data: TABLE
        }, userData);

      // Update iframe
      if (pymChild) {
        pymChild.sendHeight();
      }

  }
}

var renderAutoText = function(userDataMeasures) {
  d3.select(".text-intro").html('');
  d3.select(".footnote-1").html('');
  d3.select(".footnote-2").html('');
  d3.select(".footnote-3").html('');
  d3.select(".footnote-4").html('');


  d3.select(".auto-text").html('');
  d3.select(".bar-filtered").html('');

  if (stateName != "Select a Location") {

    for (i in userDataMeasures) {
      var stateName = userDataMeasures[i]
      var noDataProvided = (stateName.add == "Not known" && stateName.now == "Not known");
      if (!noDataProvided) {
        d3.select(".auto-text").append("div").attr("class", "auto-table-hrr");

        d3.select(".auto-table-hrr").append("tr").attr("class", "auto-table-hed")
        .html(`
        <td class="amt">Total estimated need</td>
        <td class="amt">Current staffing level</td>
        <td class="amt">Reserve staff</td>
        <td class="amt">Total staff per 100k (including reserve capacity)</td>
      `);
        d3.select(".auto-table-hrr").append("tr")
        .html(`
          <td class="amt">${fmtComma(stateName.needed)}</td>
          <td class="amt">${fmtComma(stateName.now)}</td>
          <td class="amt">${fmtComma(stateName.add)}</td>
          <td class="amt">${ noDataProvided ? "Not known" : stateName.total_percap}</td>
        `);
      }

      d3.select(".text-intro").append("p")
        .html(`
          <span class="state-bold">${stateName.label}</span> ${stateName.sufficient}.
        `);

        d3.select(".footnote-1").append("p")
        .html(`
          ${stateName.footnote1}
        `);

        d3.select(".footnote-2").append("p")
        .html(`
          ${stateName.footnote2}
        `);

        d3.select(".footnote-3").append("p")
        .html(`
          ${stateName.footnote3}
        `);

        d3.select(".footnote-4").append("p")
        .html(`
          ${stateName.footnote4}
        `);

    }
  }
}

// Render a stacked bar chart.
var renderStackedBarChart = function(config, userData) {
  var allData = config.data;
  config.data = TABLE.filter(x=>x.label == userData);
  // Setup
  var labelColumn = "label";

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 10;
  var labelMargin = 6;
  // var valueGap = 3;

  var margins = {
    top: 50,
    right: 10,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 25;

  if (isMobile.matches) {
    ticksX = 4;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var values = allData.map(function(d) {
    return Math.max(d["needed per cap"], d["total_percap"]);
  });
  
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  var max = Math.max(...ceilings);

  if (min > 0) {
    min = 0;
  }
  max = 350;

console.log(addData)
  var xScale = d3
    .scaleLinear()
    .domain([0, max])
    .rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(d => skipLabels.indexOf(d) == -1)
    )
    .range([ COLORS.teal3, COLORS.teal5]);

  var noDataProvided = (config.data[0].add_override == "Not known" && config.data[0].now_override == "Not known");
  if (!noDataProvided) {
    // Render the legend.
    var legend = containerElement
      .append("ul")
      .attr("class", "key")
      .selectAll("g")
      .data(colorScale.domain())
      .enter()
      .append("li")
      .attr("class", function(d, i) {
        var c = `key-item key-${i} ${classify(d)}`
        if (parseFloat(config.data[0][d]) <= 0) {
          c += ' hidden';
        }
        return c;
      });

    legend.append("b").style("background-color", colorScale);

    legend.append("label").text(function(d, i) {
       var text = d;
        if (parseFloat(config.data[0][d]) <= 0) {
          text += ' (not available)';
        }
        return text;
      });

    d3.select('.reserve-staff-per-100k-residents')
  }

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    // .tickFormat(d => d);
    .tickFormat(function (d) {
      if ((d / 1000000) >= 1) {
        d = "$" + d / 1000000 + "M";
      }
      return d;
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = () => xAxis;

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );


  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group " + classify(d[labelColumn]))
    .attr(
      "transform",
      (d, i) => "translate(0," + i * (barHeight + barGap) + ")"
    );

  console.log(config.data)
  group
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", d => colorScale(d.name))
    .attr("class", d => classify(d.name));

  // Render 0-line.
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight);
  }

    chartElement.append("text")
    .attr("class", "model-label")
    .attr("x", function(d) {
      return xScale(config.data[0]['needed per cap'])
    })
    .attr("y", -28)
    .attr("text-anchor", function(d){
      if (config.data[0]['needed per cap'] + 15 > max) {
        return "end"
      }
      return "start"
    })
    .text(function(d) {
      return `Estimated Need Per Capita (${config.data[0]['needed per cap'].toFixed(2)})`;
    })
    .call(wrapText,120,13);

    chartElement.append("line")
    .attr("class", "model-line")
    .attr("x1", xScale(config.data[0]['needed per cap']))
    .attr("x2", xScale(config.data[0]['needed per cap']))
    .attr("y1", -10)
    .attr("y2", chartHeight)
    .style("stroke-width", "1.5")
    .style("stroke-dasharray", ("3, 3"));
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
