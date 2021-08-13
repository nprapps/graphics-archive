var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var ALLSTATES = require("./states.js");

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "sum"];

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

  window.addEventListener("resize", render, function(){renderDrop(userData)});

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    // pymChild.onMessage("on-screen", function(bucket) {
    //   ANALYTICS.trackEvent("on-screen", bucket);
    // });
    // pymChild.onMessage("scroll-depth", function(data) {
    //   data = JSON.parse(data);
    //   ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    // });
  });
};

// Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    var x0 = 0;

    d.values = [];

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

      var x1 = x0 + d[key];

      d.values.push({
        name: key,
        x0: x0,
        x1: x1,
        val: d[key]
      });

      x0 = x1;
    }
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  //table

ALLSTATES = DATA.map(d => d.label);
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
        renderDrop(userData);
        });

  var renderDrop = function(userData) {
    // handle user data

    var userDataMeasures = [];
    if (userData != "") {
        var matchUserDataRows = TABLE.filter(x=>x.label == userData)

        for (i in matchUserDataRows) {
          var matchRow = matchUserDataRows[i];
          var d = {};
          d['label'] = matchRow.label;
          d['now'] = matchRow.now_override || matchRow.now || "Not known";
          d['add'] = matchRow.add_override || matchRow.add || "0";
          d['total_percap'] = matchRow.total_percap;
          d['sufficient'] = matchRow.sufficient;
          d['footnote1'] = matchRow.footnote_1;
          d['footnote2'] = matchRow.footnote_2;
          d['footnote3'] = matchRow.footnote_3;


         userDataMeasures.push(d)

        }
        renderAutoText(userDataMeasures);
        if (pymChild) {
          pymChild.sendHeight();
        }


        renderStackedBarChart({
          container,
          width,
          data: DATA.filter(x=>x.label == userData)
        });

      // Update iframe
      if (pymChild) {
        pymChild.sendHeight();
      }

};
}

var renderAutoText = function(userDataMeasures) {

  d3.select(".text-intro").html('');
  d3.select(".footnote-1").html('');
  d3.select(".footnote-2").html('');
  d3.select(".footnote-3").html('');


   d3.select(".auto-text").html('');
   d3.select(".bar-filtered").html('');

    if (stateName != "Select a Location") {

      d3.select(".auto-text").append("div")
        .attr("class", "auto-table-hrr");

      d3.select(".auto-table-hrr").append("tr")
        .attr("class", "auto-table-hed")
        .html(`
          <td class="amt">Current staffing level</td>
          <td class="amt">Planned hires</td>
          <td class="amt">Projected total after hires per 100K residents</td>
        `);

      for (i in userDataMeasures) {
        var stateName = userDataMeasures[i]

        d3.select(".auto-table-hrr").append("tr")
          .html(`
            <td class="amt">${fmtComma(stateName.now)}</td>
            <td class="amt">${fmtComma(stateName.add)}</td>
            <td class="amt">${stateName.total_percap}</td>

          `);

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

      }

    }

}

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }


// Render a stacked bar chart.
var renderStackedBarChart = function(config) {
  console.log(config.data);
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
  var roundTicksFactor = 100;

  if (isMobile.matches) {
    ticksX = 4;


  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  // var max = Math.max(...ceilings);
  var max = 70;

  if (isMobile.matches) {
    max = 72;
  }

  if (min > 0) {
    min = 0;
  }

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

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  legend.append("b").style("background-color", colorScale);

  legend.append("label").text(d => d);

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


    // Append dotted line for model 15
  chartElement.append("line")
    .attr("class", "model-line")
    .attr("x1", xScale(15))
    .attr("x2", xScale(15))
    .attr("y1", -10)
    .attr("y2", chartHeight)
    .style("stroke-dasharray", ("3, 3"))
    .style("stroke-width", "1.5");

    // Append dotted line for model 30

  chartElement.append("line")
    .attr("class", "model-line")
    .attr("x1", xScale(30))
    .attr("x2", xScale(30))
    .attr("y1", -10)
    .attr("y2", chartHeight)
    .style("stroke-width", "1.5")
    .style("stroke-dasharray", ("3, 3"));

  //Render bar totals

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => (d.sum))
    .attr("class", d => classify(d.label))
    .attr("x", d => xScale(d.sum) + 5)
    .attr("y", barHeight / 2 + 4);

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

    // Append label for model 15

    chartElement.append("text")
      .attr("class", "model-label")
      // .attr("x", xScale(15))
      .attr("x", function(d) {
        if(isMobile.matches) {
          var xPos = xScale(20)
        } else {
          var xPos = xScale(15)
        } return xPos;
      })
      .attr("y", -40)
      .attr("text-anchor", function(d){
        if(isMobile.matches) {
          var anchor = "end"
        } else {
          var anchor = "middle"
        } return anchor;
      })      .text(LABELS.label15)
      .call(wrapText,100,13)


    // Append label for model 30

    chartElement.append("text")
    .attr("class", "model-label")
    .attr("x", function(d) {
      if(isMobile.matches) {
        var xPos = xScale(25)
      } else {
        var xPos = xScale(31)
      } return xPos;
    })
    .attr("y", -28)
    .attr("text-anchor", function(d){
      if(isMobile.matches) {
        var anchor = "start"
      } else {
        var anchor = "middle"
      } return anchor;
    })
    .text(LABELS.label30)
    .call(wrapText,120,13);


};
      // Update iframe
      if (pymChild) {
        pymChild.sendHeight();
      }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
