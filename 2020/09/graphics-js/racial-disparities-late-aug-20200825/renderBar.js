// build our custom D3 object
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");


// Render state cases and deaths bar chart
module.exports = function(config) {

  var filterOut = config.metrics.toString().split(", ").join(",").split(",");
  filterOut.unshift("state_name", "values", "pop");

  config.data.forEach(function(d) {
    var x0 = 0;
    var type = config.type;

    d.values = [];

    for (var key in d) {
      if (filterOut.indexOf(key) > -1) {
        continue;
      }

      var race = key.split("_");
      if (race[0] == type.slice(0, -1) || race [0] == type && race[1] == "pop") {
        d.pop = d[key] * 100;
      }

      if (isNaN(d[key])) {
        var x1 = 0;
        // d[key] = 0;
      } else {
        var x1 = x0 + d[key];
      }

      d.values.push({
        name: key,
        x0: x0,
        x1: x1 * 100,
        val: d[key]
      });

      // x0 = x1;
    }

  });
  config.data[0].values.pop();

  // Setup
  var labelColumn = "name";
  var valueColumn = "x1"

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 120;
  var labelMargin = 10;
  var valueGap = 3;

  var margins = {
    top: 70,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 100;

  if (isMobile.matches) {
    ticksX = 4;
  }

  // Calculate actual chart dimensions
  var chartWidth = (config.width - margins.left - margins.right);
  var chartHeight = (barHeight + barGap) * config.data[0].values.length;

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
  var max = Math.max(...ceilings);
  // var max = 70;

  if (isMobile.matches) {
    max = 72;
  }

  if (min > 0) {
    min = 0;
  }

  var xScale = d3
    .scaleLinear()
    .domain([0, 100])
    .rangeRound([0, chartWidth]);

  

  var colorScale2 = d3
    .scaleThreshold()
    .domain(config.legendLabels.split("|").map(l => +l.trim()))
    .range(config.pctColorRamp);

    // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "lookup-wrapper graphic-wrapper")

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  var chartTitle = chartElement
      .append("text")
      .attr("class", "chart-title")
      .attr("x", (chartWidth - labelWidth) / 2)
      .attr("y", -(margins.top / 2) - 25)
      .attr("text-anchor", "middle")
      .text(LABELS.lookup_race_title);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => d + "%");

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
    chartElement
      .append("g")
      .attr("class", "bars")
      .selectAll("rect")
      .data(config.data[0].values)
      .enter()
      .append("rect")
      .attr("x", d => d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn]))
      .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])))
      .attr("y", (d, i) => i * (barHeight + barGap))
      .attr("height", barHeight)
      .style("fill", function(d){
        var ratio = (d.val / (config.data[0].pop / 100))             
        return colorScale2(ratio)
      })
      .attr("class", (d, i) => `${classify(d[labelColumn])}`);

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

  // Render bar labels.
  chartWrapper
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + 3 + "px",
        left: "0"
      })
    )
    .selectAll("li")
    .data(config.data[0].values)
    .enter()
    .append("li")
    .attr("style", function(d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px"
      });
    })
    .attr("class", (d, i) => `${classify(d[labelColumn])}`)
    .append("span")
    // .text(d => d[labelColumn].replace(/_/g, " "));
    .html(function(d) {

      var upper = d[labelColumn].charAt(0).toUpperCase() + d[labelColumn].slice(1);      
      return upper.replace(/_/g, " ").replace("cases",`<span class="bold">cases</span>`).replace("deaths",`<span class="bold">deaths</span>`).replace("Aian","Native American")
    });

    // Append population line
    chartElement.append("line")
    .attr("class", "population-line")
    .attr("x1", xScale(config.data[0].pop))
    .attr("x2", xScale(config.data[0].pop))
    .attr("y1", -10)
    .attr("y2", chartHeight)
    .style("stroke-dasharray", ("3, 3"))
    .style("stroke-width", "1.5");

    // Append population label
    chartElement.append("text")
      .attr("class", "population-label")
      .attr("x", xScale(config.data[0].pop))
      .attr("y", -30)
      .attr("text-anchor", "start")
      .text(function(d) {
        var upper = config.type;
        if (config.type == "blacks") {
          upper = upper.slice(0, -1);
        }
        upper = upper.charAt(0).toUpperCase() + upper.slice(1)

        if (upper == "Latinx") {
          upper = "Hispanic or Latino"
        } else if (upper == "Black") {
          upper = "Black"
        } else {
          upper = "Native American"
        }

        return upper + " share of population";
      })
      .call(wrapText,120,13);

      // Render bar shadows
      chartElement
        .append("g")
        .attr("class", "rect rect-shadow")
        .selectAll("rect")
        .data(config.data[0].values)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.x1) + 3)
        .attr("y", (d, i) => i * (barHeight + barGap) + 5)
        .attr("width", 30)
        .attr("height", 20)
        .style("fill", "#fff");

      // Render bar values
      chartElement
        .append("g")
        .attr("class", "value")
        .selectAll("text")
        .data(config.data[0].values)
        .enter()
        .append("text")
        .text(function(d) {
          if (isNaN(d.val)) {
            return "Not enough data available";
          } else {
            return d.x1.toFixed(0) + "%";
          }
        })
        .attr("class", d => classify(d.name))
        .attr("x", d => xScale(d.x1) + 5)
        .attr("y", (d, i) => i * (barHeight + barGap))
        .attr("dx", function(d) {
        var xStart = xScale(d[valueColumn]);
        var textWidth = this.getComputedTextLength();

        // Negative case
        if (d.x1 < 0) {
          var outsideOffset = -(valueGap + textWidth);

          if (xStart + outsideOffset < 0) {
            d3.select(this).classed("in", true);
            return valueGap;
          } else {
            d3.select(this).classed("out", true);
            return outsideOffset;
          }
          // Positive case
        } else {
          if (xStart + valueGap + textWidth > chartWidth) {
            d3.select(this).classed("in", true);
            return -(valueGap + textWidth);
          } else {
            d3.select(this).classed("out", true);
            return valueGap;
          }
        }
      })
      .attr("dy", barHeight / 2 + 3);
};
