var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-svg-annotation/d3-annotation.min"),
};

var {
  COLORS,
  classify,
  makeTranslate,
  formatStyle,
  fmtComma,
} = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a stacked bar chart.
var renderStackedBarChart = function (config) {
  // Setup
  var { labelColumn, nameColumn } = config;

  var barHeight = isMobile.matches ? 30 : 45;
  var barGap = 5;
  var labelWidth = 0;
  var labelMargin = 0;
  var valueGap = 6;

  var margins = {
    top: isMobile.matches ? 76 : 105,
    right: 0,
    bottom: isMobile.matches ? 80 : 110,
    left: labelWidth + labelMargin,
  };

  var ticksX = 4;
  var roundTicksFactor = 100;

  if (isMobile.matches) {
    ticksX = 2;
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
  var max = Math.max(...ceilings);

  if (min > 0) {
    min = 0;
  }

  max = config.labels.e_total;

  var xScale = d3.scaleLinear().domain([min, max]).rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data[0].values.map(d => d[nameColumn]))
    .range([COLORS.teal2, COLORS.teal3, COLORS.teal4, COLORS.blue4, "#aaa"]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  legend
    .append("b")
    .style("background-color", colorScale)
    .attr("class", (d, i) => `${classify(d)}`);

  legend.append("label").text(d => config.labels[`e_${d}`]);

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
    .tickFormat(d => (d === 0 ? d : `${fmtComma(d)}m`));

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis.tickSize(-chartHeight, 0, 0).tickFormat(""));

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
    .style("fill", d => colorScale(d[nameColumn]))
    .attr("class", d => classify(d[nameColumn]));

  // // Render bar values.
  // group
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(d => d.values)
  //   .enter()
  //   .append("text")
  //   .text(d => (d.val > 2 ? `${d.val ? fmtComma(d.val) : null}m` : ""))
  //   .attr("class", d => classify(d.name))
  //   .attr("x", d => xScale(d.x1))
  //   .attr("dx", function (d) {
  //     var textWidth = this.getComputedTextLength();
  //     var barWidth = Math.abs(xScale(d.x1) - xScale(d.x0));

  //     // Hide labels that don't fit
  //     if (textWidth + valueGap * 2 > barWidth) {
  //       d3.select(this).classed("hidden", true);
  //     }

  //     if (d.x1 < 0) {
  //       return valueGap;
  //     }

  //     return -(valueGap + textWidth);
  //   })
  //   .attr("dy", barHeight / 2 + 4);

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
        top: margins.top + "px",
        left: "0",
      })
    )
    .selectAll("li")
    .data(config.data)
    .enter()
    .append("li")
    .attr("style", (d, i) =>
      formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px;",
      })
    )
    .attr("class", d => classify(d[labelColumn]))
    .append("span")
    .text(d => d[labelColumn]);

  // Annotations
  var type = d3.annotationCustomType(d3.annotationLabel, {
    className: "custom",
    note: { orientation: "topBottom" },
  });

  var annotations = config.annotations.map(
    ({
      id,
      title,
      align_mobile,
      value,
      value_mobile,
      dx,
      dy,
      dx_mobile,
      dy_mobile,
    }) => ({
      id,
      note: {
        label: config.labels[`e_${id}`],
        title,
        align: isMobile.matches ? align_mobile : "left",
      },
      x: isMobile.matches ? xScale(value_mobile) : xScale(value),
      y: barHeight / 2,
      dx: isMobile.matches ? dx_mobile : dx,
      dy: isMobile.matches ? dy_mobile : dy,
      className: id,
    })
  );

  const makeAnnotations = d3
    .annotation()
    //.editMode(true)
    .notePadding(5)
    .type(type)
    .annotations(annotations);

  chartElement
    .append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations);

  var padding = 3;

  chartElement.selectAll(".annotation").each(function () {
    var container = d3.select(this);
    var className = container.data()[0].id;
    var note = container.select(".annotation-note");
    var { x, y, width, height } = note
      .select(".annotation-note-title")
      .node()
      .getBBox();
    note
      .select(".annotation-note-bg")
      .attr("width", width + padding * 2)
      .attr("height", height + padding * 2)
      .attr(
        "x",
        isMobile.matches && className === "platinum" ? x - padding * 2 : x
      )
      .attr("y", y - padding * 2)
      .attr("rx", isMobile.matches ? 2 : 3)
      .attr("fill-opacity", 1)
      .attr("fill", colorScale(className));
    note
      .select(".annotation-note-title")
      .attr(
        "transform",
        isMobile.matches && className === "platinum"
          ? makeTranslate(-padding, -padding)
          : makeTranslate(padding, -padding)
      )
      .attr("fill", "#fff");
  });

  if (isMobile.matches) {
    chartElement
      .select(".platinum > .annotation-note")
      .attr("transform", `translate(30, ${30 + padding * 2})`);
    chartElement
      .select(".subsidized > .annotation-note")
      .attr("transform", `translate(-5, ${30 + padding * 2})`);

    chartElement
      .select(".medicaid > .annotation-note")
      .attr("transform", `translate(-5, -30)`);
    chartElement
      .select(".marketplace > .annotation-note")
      .attr("transform", `translate(-5, -30)`);
    chartElement
      .select(".ineligible > .annotation-note")
      .attr("transform", `translate(-5, -30)`);
  } else {
    chartElement
      .select(".platinum > .annotation-note")
      .attr("transform", `translate(-5, ${60 + padding * 2})`);
    chartElement
      .select(".subsidized > .annotation-note")
      .attr("transform", `translate(-5, ${60 + padding * 2})`);

    chartElement
      .select(".medicaid > .annotation-note")
      .attr("transform", `translate(-5, -60)`);
    chartElement
      .select(".marketplace > .annotation-note")
      .attr("transform", `translate(-5, -60)`);
    chartElement
      .select(".ineligible > .annotation-note")
      .attr("transform", `translate(-5, -60)`);
  }
};

module.exports = { renderStackedBarChart };
