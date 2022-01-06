var { isMobile } = require("./lib/breakpoints");
var { COLORS, makeTranslate } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
};

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

// Render a column chart.
module.exports = function (config) {
  // Setup chart container
  var { labelColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 2 : 4;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 32,
  };

  var ticksY = 4;
  var roundTicksFactor = 50;

  var divisor = isMobile.matches ? 2 : 4;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  config.data.forEach(function (data, i) {
    var header = data[labelColumn];
    var increase = data.increase;

    var transformed = Object.entries(data)
      .filter(d => d[0] != "label" && d[0] != "increase")
      .map(d => d);

    // console.log(header, (header != "asian" && !(header =="hispanic" && isMobile.matches) ))
    if (header != "asian" && !(header == "white" && isMobile.matches)) {
      margins.left = 0;
      transformed.unshift(["2006", 1]);
    } else {
      margins.left = 32;
    }

    // Calculate actual chart dimensions
    var chartWidth = config.width / divisor - margins.left - margins.right;
    var chartHeight =
      Math.ceil((config.width * aspectHeight) / aspectWidth) -
      margins.top -
      margins.bottom;

    // Create the root SVG element.
    var chartWrapper = containerElement
      .append("div")
      .attr("class", "graphic-wrapper " + header);

    increase = increase % 1 ? increase.toFixed(1) : increase.toFixed(0);
    var plus = increase >= 0 ? '+' : '';

    chartWrapper.append("h3").text(header).attr("class", header);
    chartWrapper.append("h5").text(`${plus}${increase}% vs. 2008`).attr("class", header);

    var chartElement = chartWrapper
      .append("svg")
      .attr("width", chartWidth + margins.left + margins.right)
      .attr("height", chartHeight + margins.top + margins.bottom)
      .append("g")
      .attr("transform", `translate(${margins.left},${margins.top})`);

    // Create D3 scale objects.
    var xScale = d3
      .scaleBand()
      .range([0, chartWidth])
      .round(true)
      .padding(0.1)
      .domain(transformed.map(d => d[0]));

    var floors = transformed.map(
      d => Math.floor(d[1] / roundTicksFactor) * roundTicksFactor
    );

    var min = Math.min(...floors);

    if (min > 0) {
      min = 0;
    }

    var ceilings = transformed.map(
      d => Math.ceil(d[1] / roundTicksFactor) * roundTicksFactor
    );

    var max = 80;

    var yScale = d3.scaleLinear().domain([min, max]).range([chartHeight, 0]);

    // Create D3 axes.
    var xAxis = d3
      .axisBottom()
      .scale(xScale)
      .tickFormat(function (d, i) {
        return d;
      })
      .tickValues(["2008", "2012", "2016", "2020"]);

    var yAxis = d3
      .axisLeft()
      .scale(yScale)
      .ticks(ticksY)
      .tickFormat(function (d) {
        if (header == "asian" || (header == "white" && isMobile.matches)) {
          return d + "%";
        }
      });

    // Render axes to chart.
    chartElement
      .append("g")
      .attr("class", "x axis")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxis);

    chartElement.append("g").attr("class", "y axis").call(yAxis);

    // Render grid to chart.

    chartElement
      .append("g")
      .attr("class", "y grid")
      .call(yAxis.tickSize(-chartWidth - 200, 40).tickFormat(""));

    // var transformed = Object.entries(data).map(d => d)

    // Render bars to chart.
    chartElement
      .append("g")
      .attr("class", "bars")
      .selectAll("rect")
      .data(transformed)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d[0])) //xScale(d[0])
      .attr("y", d => (d[1] < 0 ? yScale(0) : yScale(d[1])))
      .attr("width", xScale.bandwidth())
      .attr("height", d =>
        d[1] < 0 ? yScale(d[1]) - yScale(0) : yScale(0) - yScale(d[1])
      )
      .attr("class", function (d) {
        return "bar bar-" + d[0];
      });

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

    // Render bar values.
    chartElement
      .append("g")
      .attr("class", "value")
      .selectAll("text")
      .data(transformed)
      .enter()
      .append("text")
      .text(d => d[1].toFixed(0) + "%")
      .attr("class", d => "label-" + d[0])
      .attr("x", d => xScale(d[0]) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d[1]))
      .attr("dy", function (d) {
        var textHeight = this.getBBox().height;
        var $this = d3.select(this);
        var barHeight = 0;

        if (d[1] < 0) {
          barHeight = yScale(d[1]) - yScale(0);

          if (textHeight + valueGap * 2 < barHeight) {
            $this.classed("in", true);
            return -(textHeight - valueGap / 2);
          } else {
            $this.classed("out", true);
            return textHeight + valueGap;
          }
        } else {
          barHeight = yScale(0) - yScale(d[1]);

          if (textHeight + valueGap * 2 < barHeight) {
            $this.classed("in", true);
            return textHeight + valueGap;
          } else {
            $this.classed("out", true);
            return -(textHeight - valueGap / 2);
          }
        }
      })
      .attr("text-anchor", "middle");

    if (header != "asian" && !(header == "white" && isMobile.matches)) {
    chartElement
      .append("g")
      .append("rect")
      .attr("class", "midsection")
      .attr("x", xScale("2006") + xScale.bandwidth() / 4)
      .attr("y", 0)
      .attr("width", 4)
      .attr("height", chartHeight);
    }
    // else {
    //   chartElement
    //   .append("g")
    //   .append("text")
    //   .attr("class", "text-label")
    //   .attr("x", -5)
    //   .attr("y", yScale(81))
    //   .text("80% turnout");
    // } 
  });
};
