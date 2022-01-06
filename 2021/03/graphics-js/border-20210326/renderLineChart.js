var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, fmtComma } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 30,
    bottom: 20,
    left: 43
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = config.roundTicksFactor;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 30;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d.date);
  // var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    // .scaleOrdinal()
    .scaleBand()
    .round(false)
    .padding(0)
    .domain(dates)
    .range([0, chartWidth]);

  var values = config.data.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );

  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  // var colorScale = d3
  //   .scaleOrdinal()
  //   .domain(
  //     config.data.map(function(d) {
  //       return d.name;
  //     })
  //   )
  //   .range([
  //     COLORS.red3,
  //     COLORS.yellow3,
  //     COLORS.blue3,
  //     COLORS.orange3,
  //     COLORS.teal3
  //   ]);

  // Render the HTML legend.

  // var oneLine = config.data.length > 1 ? "" : " one-line";
  //
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key" + oneLine)
  //   .selectAll("g")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("class", d => "key-item " + classify(d.name));
  //
  // legend.append("b").style("background-color", d => colorScale(d.name));
  //
  // legend.append("label").text(d => d.name);

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
    .tickValues(xScale.domain().filter(function(d,i) {
      return !(i % 2)
    }))
    // .ticks(ticksX)
    // .tickFormat(function(d, i) {
    //   if (isMobile.matches) {
    //     return "\u2019" + yearAbbrev(d);
    //   } else {
    //     return yearFull(d);
    //   }
    // });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  // Render grid to chart.

  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

  // Render 0 value line.

  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  // Render lines to chart.
  var line = d3
    .line()
    .defined(function(d) {
      return typeof d[valueColumn] != "undefined";
    })
    .x(d => xScale(d[dateColumn]) + (xScale.bandwidth() / 2))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
      .append("path")
      .attr("class", function(d) {
        let isHighlight = config.annotations[d.name] ? "highlight" : "";
        return "line " + classify(d.name) + " " + isHighlight;
      })
      // .attr("stroke", d => colorScale(d.name))
      .attr("d", d => line(d.values))
      .on("mouseover", function(d) {
        if (!d3.select(this).attr("class").includes("highlight")) {
          d3.select(this).classed("active", true);
          d3.select(this).style("stroke", "#989898");
          d3.select(".label." + d.name.toLowerCase()).style("display", "block");
        }
      })
      .on("mouseout", function(d) {
        if (!d3.select(this).attr("class").includes("highlight")) {
          d3.select(this).classed("active", false);
          d3.select(this).style("stroke", "#e0e0e0");
          d3.select(".label." + d.name.toLowerCase()).style("display", "none");
        }
      });

  d3.selectAll(".active").raise();

  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
      .attr("x", function(d) {
        if (typeof config.annotations != "undefined" && typeof config.annotations[d.name] != "undefined") {
          var annotItem = 0;
          d.values.forEach((item, i) => {
            if (item[dateColumn] == config.annotations[d.name].date) {
              annotItem = i;
            }
          });
          return xScale(d.values[annotItem][dateColumn]) + (xScale.bandwidth() / 2) + 5;
        } else {
          return xScale(lastItem(d)[dateColumn]) + (xScale.bandwidth() / 2) + 5;
        }
      })
      .attr("y", function(d) {
        if (typeof config.annotations != "undefined" && typeof config.annotations[d.name] != "undefined") {
          var annotItem = 0;
          d.values.forEach((item, i) => {
            if (item[dateColumn] == config.annotations[d.name].date) {
              annotItem = i;
            }
          });
          return yScale(d.values[annotItem][valueColumn]) - 3;
        } else {
          return yScale(lastItem(d)[valueColumn]) + 3;
        }
      })
      .attr("dy", function(d) {
        if (typeof config.offsets != "undefined" && typeof config.offsets[d.name] != "undefined") {
          return config.offsets[d.name];
        } else {
          return 0;
        }
      })
      .attr("class", d => "label " + classify(d.name))
      .text(function(d) {
        var item = lastItem(d);
        var value = item[valueColumn];
        var label = fmtComma(value);

        if (!isMobile.matches) {
          label = d.name + ": " + label;
        }

        return d.name;
      });

};
