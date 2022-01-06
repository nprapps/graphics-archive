var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
};

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

var $ = require("./lib/qsa");

var includes = ["los angeles county", "compton"];

var light = isMobile.matches ? ["gardena", "beverly hills"] : ["long beach", "los angeles", "gardena", "beverly hills"];

// Render a line chart.
module.exports = function (config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 8;

  var annotationXOffset = -6;
  var annotationYOffset = -20;
  var annotationWidth = 70;
  var annotationLineHeight = 12;

  var margins = {
    top: 15,
    right: 120,
    bottom: 20,
    left: 40,
  };

  var ticksX = 4;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 120;
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
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3.scaleTime().domain(extent).range([0, chartWidth]);

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

  var yScale = d3.scaleLinear().domain([min, max]).range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function (d) {
        return d.name;
      })
    )
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3,
    ]);

  // Create the root SVG element.

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`)
    .attr("class", "main");

  // Create D3 axes.
  var highlight = function (d) {
    return (
      d.toLowerCase() == selectedState || includes.includes(d.toLowerCase())
    );
  };

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function (d, i) {
      if (isMobile.matches) {
        return "\u2019" + yearAbbrev(d);
      } else {
        return yearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      var base = d == 0 ? d : d + "%";
      return base;
    } );

  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .append("text")
  //   .text("white")
  //   .attr("x", xScale(new Date(1935, 1, 1)))
  //   .attr("y", yScale(95))

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement.append("g").attr("class", "y axis").call(yAxis);

  // Render grid to chart.

  var xAxisGrid = function () {
    return xAxis;
  };

  var yAxisGrid = function () {
    return yAxis;
  };

  var selectedState = null;

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxisGrid().tickSize(-chartHeight, 0, 0).tickFormat(""));

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(yAxisGrid().tickSize(-chartWidth, 0, 0).tickFormat(""));

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
    .curve(d3.curveCatmullRom.alpha(0.15))
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  var lines = chartElement.append("g").attr("class", "lines");

  lines
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr(
      "class",
      d =>
        "line " +
        classify(d.name) +
        (highlight(d.name) ? " active" : " inactive")
    )
    .attr("d", d => line(d.values))
    .on("mouseover", mouseover)
    .on("mouseleave", () => {});

  $.one("#line-chart").addEventListener("mouseleave", mouseoutChart);

  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 8)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .text(function (d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value % 1 ? value.toFixed(1) : value.toFixed(0);

      var add = '';
      // if (includes.includes(d.name.toLowerCase())) add = ' white';

      return d.name + ": " + label + "%" + add;
    })
    .attr("class", function (d) {
      var isBackground = light.includes(d.name.toLowerCase())
        ? "background"
        : "";
      return (
        (highlight(d.name) ? "active " : "inactive ") +
        classify(d.name) +
        " " +
        isBackground
      );
    })
    .call(wrapText, isMobile.matches ? 120 : 120, 12);

  var backgroundDots = chartElement
    .append("g")
    .attr("class", "background-dots")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", function (d) {
      var isBackground = light.includes(d.name.toLowerCase())
        ? "background"
        : "";
      return `dot ${classify(d.name)} ${isBackground}`;
    });

  backgroundDots
    .selectAll("circle")
    .data(function (d, i) {
      d.values.forEach(function (v, k) {
        v.series = d.name;
      });
      return d.values;
    })
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("stroke", "#fff")
    .attr("r", 2);

  var dots = chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", function (d) {
      var isActive = highlight(d.name) ? "" : "inactive";
      return `dot ${classify(d.name)} ${isActive}`;
    });

  dots
    .selectAll("circle")
    .data(function (d, i) {
      d.values.forEach(function (v, k) {
        v.series = d.name;
      });
      return d.values;
    })
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("stroke", "#fff")
    .attr("r", 4);

  var order_dates = ANNOTATIONS;

  var dates = chartElement
    .append("g")
    .attr("class", "date-annotations")
    .selectAll("line")
    .data(order_dates)
    .enter();
  // order line
  dates
    .append("line")
    .attr("x1", d => xScale(new Date(d["begin"])))
    .attr("x2", d => xScale(new Date(d["begin"])))
    .attr("y1", chartHeight)
    .attr("y2", 0)
    .attr("class", "median-line");

  dates
    .append("text")
    .classed("chart-label", true)
    .attr("x", function (d) {
      var add = d.anchor == "left" ? -5 : 5;
      return xScale(new Date(d.begin)) + add;
    })
    .attr("y", d => chartHeight - d.offset - 15)
    .style("font-weight", "bold")
    .attr("text-anchor", d => (d.anchor == "left" ? "end" : "start"))
    .html(d => yearFull(new Date(d.begin)) + ": ")
    .call(wrapText, isMobile.matches ? 80 : 140, annotationLineHeight);

  dates
    .append("text")
    .classed("chart-label", true)
    .attr("x", function (d) {
      var add = d.anchor == "left" ? -5 : 5;
      return xScale(new Date(d.begin)) + add;
    })
    .attr("y", d => chartHeight - d.offset)
    .attr("text-anchor", d => (d.anchor == "left" ? "end" : "start"))
    .html(d => d.text)
    .call(wrapText, isMobile.matches ? 70 : 200, isMobile.matches ? annotationLineHeight : 15);

    var lineText = chartElement
    .append("g")
    .attr("class", "line-texts")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", function (d) {
      var isBackground = light.includes(d.name.toLowerCase())
        ? "background"
        : "";
      return `${classify(d.name)} ${isBackground}`;
    });

  // lineText
  //   .selectAll("rect")
  //   .data(function (d, i) {
  //     d.values.forEach(function (v, k) {
  //       v.series = d.name;
  //     });
  //     var arr = d.values.slice()
  //     arr.pop();
  //     return arr;
  //   })
  //   .enter()
  //   .append("rect")
  //   .attr("x", d => xScale(d[dateColumn]))
  //   .attr("y", d => yScale(d[valueColumn]) - 30)
  //   .attr("width", 35)
  //   .attr("height", 20)
  //   .attr("class", function(d) {
  //      return "background-rect " 
  //      + classify(d.series) + (d.series.toLowerCase() == "compton" ? '' : ' inactive');
  //   });

  lineText
    .selectAll("text")
    .data(function (d, i) {
      d.values.forEach(function (v, k) {
        v.series = d.name;
      });
      var arr = d.values.slice()
      arr.pop();
      return arr;
    })
    .enter()
    .append("text")
    .attr("x", d => xScale(d[dateColumn]))
    .attr("y", d => Math.max(-6, yScale(d[valueColumn]) - 10))
    .text(d => (d[valueColumn] % 1 ? d[valueColumn].toFixed(1) : d[valueColumn].toFixed(0)) + '%')
    .attr("class", function(d) {
       return classify(d.series) + (d.series.toLowerCase() == "compton" ? '' : ' inactive');
    });

    
};

function mouseover(d) {

  if (isMobile.matches ) return;
  d3.selectAll(`.line`).classed("active", false);
  d3.selectAll(`.value > text`).classed("inactive", true);
  d3.selectAll(`.value > text`).classed("background", false);
  d3.selectAll(`.dots .dot`).classed("inactive", true);

  d3.selectAll(`.line-texts text`)
    .classed("inactive", true);

  light.forEach(function (d, i) {
    d3.select(`.value > text.${classify(d)}`)
      .classed("background", false)
      .raise();
  });

  

  includes.forEach(function (d, i) {
    d3.select(`.line.${classify(d)}`)
      .classed("active", true)
      .raise();
    d3.select(`.value > text.${classify(d)}`)
      .classed("inactive", false)
      .raise();
    d3.select(`.dots .dot.${classify(d)}`)
      .classed("inactive", false)
      .raise();
  });

  d3.selectAll(`.line-texts text.${classify(d.name)}`)
    .classed("inactive", false)
    .raise();
    //me

  d3.select(`.line.${classify(d.name)}`)
    .classed("active", true)
    .raise();
  d3.select(`.value > text.los-angeles-county`).classed("inactive", true);
  // d3.select(`.line.los-angeles-county`).classed("active", false);
  d3.select(`text.${classify(d.name)}`)
    .classed("inactive", false)
    .raise();
  d3.select(`.dots .dot.${classify(d.name)}`)
    .classed("inactive", false)
    .raise();
}

function mouseoutChart() {
  if (isMobile.matches ) return;
  d3.selectAll(`.line`).classed("active", false);
  d3.selectAll(`.value > text`).classed("inactive", true);
  d3.selectAll(`.dot`).classed("inactive", true);
  d3.selectAll(`.line-texts text`)
    .classed("inactive", true);

  includes.forEach(function (d, i) {
    d3.select(`.line.${classify(d)}`)
      .classed("active", true)
      .raise();
    d3.select(`.value > text.${classify(d)}`)
      .classed("inactive", false)
      .raise();
    d3.select(`.dots .dot.${classify(d)}`)
      .classed("inactive", false)
      .raise();
  });

  d3.selectAll(`.line-texts text.compton`)
    .classed("inactive", false);

  light.forEach(function (d, i) {
    d3.select(`.value > text.${classify(d)}`)
      .classed("background", true)
      .raise();
  });
}
