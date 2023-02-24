var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min")
};

var { makeTranslate, classify, formatStyle, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a bar chart.
module.exports = function(config) {
  // Setup

  var { labelColumn, valueColumn, minColumn, maxColumn } = config;

  var barHeight = 40;
  var barGap = 20;
  var barShift = 0;
  var labelWidth = 70;
  var labelMargin = 10;
  var valueMinWidth = 30;
  var stateDotRadius = 4;
  var medianDotRadius = 6;
  var medianAnnoWidth = 310;

  var margins = {
    top: 15,
    right: 25,
    bottom: 40,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 5;

  if (isMobile.matches) {
    ticksX = 4;
    barGap = 30;
    margins.right = 30;
    margins.top = 28;
    medianAnnoWidth = 250;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  containerElement.append("h3")
    .text(config.title);

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

  // Create D3 scale objects.
  var min = 0;
  var values = config.data.map(d => d[maxColumn]);
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  // var max = Math.max(...ceilings);
  // var min = Math.min(...floors);
  var min = 0;
  var max = 150;

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => d + " days");

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
    .call(
      xAxis
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  // Render range bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr("x1", d => xScale(d[minColumn]))
    .attr("x2", d => xScale(d[maxColumn]))
    .attr("y1", (d, i) => i * (barHeight + barGap) + barHeight / 2)
    .attr("y2", (d, i) => i * (barHeight + barGap) + barHeight / 2);

  // Render dots to chart.
  // state dots
  var stateDots = chartElement.append('g')
        .attr('class', 'state-dots')
        .selectAll('g')
        .data(config['valueData'])
        .enter().append('g')
            .attr('class', function(d,i) {
                return 'dots dots-' + i;
            })
            .attr('transform', function(d,i) {
                var val = (i * (barHeight + barGap)) + barShift;
                return 'translate(0,' + val + ')';
            });

    stateDots.selectAll('circle')
        .data(function(d) {
            return d;
        })
        .enter()
        .filter(d => !isNaN(d["value"]))
        .append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['value']);
            })
            .attr('cy', (barHeight / 2))
            .attr('r', stateDotRadius)
            .attr('class', function(d,i) {
                return d['state'];
            });

    stateDots.selectAll('text')
        .data(function(d) {
            var vals = [];
            // var sorted = _.sortBy(d, 'value');
            var sorted = d.sort((a, b) => a.value - b.value);
            sorted = sorted.filter(d => !isNaN(d.value));
            vals.push(sorted[0], sorted[sorted.length - 1]);
            return vals;
        })
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d['value']);
            })
            .attr('y', (barHeight / 2) - 9)
            .text(function(d) {
                return d['state'];
            });

    // median dot
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter()
            .append('line')
            .attr('class', function(d) {
                return 'median ' + classify(d['category']);
            })
            .attr('x1', function(d, i) {
                return xScale(d[valueColumn])
            })
            .attr('x2', function(d, i) {
                return xScale(d[valueColumn])
            })
            .attr('y1', function(d, i) {
                var val = i * (barHeight + barGap) + (barHeight / 2) - 6 + barShift;
                return val;
            })
            .attr('y2', function(d, i) {
                var val = i * (barHeight + barGap) + (barHeight / 2) + 6 + barShift;
                return val;
            });

      /*
       * median values long
       */
      chartElement.append('g')
        .attr('class', 'value median active long-label')
        .selectAll('text')
        .data(function(d) {
          return config['data'].filter(d => d.category == "LPN");
        })
        .enter().append('text')
        .attr('x', function(d, i) {
          return xScale(d[valueColumn]);
        })
        .attr('y', function(d,i) {
          var val = i * (barHeight + barGap) + (barHeight / 2) - 25 + barShift;
          return isMobile.matches ? val - 15 : val;
        })
        .text(function(d) {
          if (d.label == "Endorsement") {
            return "The median wait time for LPNs applying in a new state was " + d[valueColumn].toFixed(0) + " days, among all 30 states we could analyze by application type.";
          }

          if (d.label == "Exam")  {
            return "LPNs taking the nursing exam to get licensed waited " + d[valueColumn].toFixed(0) + " days."
          }
        })
        .attr("text-anchor", "middle")
        .call(wrapText, medianAnnoWidth, 13);

      // shorter median annos
        chartElement.append('g')
          .attr('class', 'value median active')
          .selectAll('text')
          .data(function(d) {
            return config['data'].filter(d => d.category == "RN");
          })
          .enter().append('text')
          .attr('x', function(d, i) {
            return xScale(d[valueColumn]);
          })
          .attr('y', function(d,i) {
            if (d.label == "Exam" && d.category == "LPN") {
              i++;
            }
            var val = i * (barHeight + barGap) + (barHeight / 2) - 10 + barShift;
            return val;
          })
          .text(function(d) {
            return d[valueColumn].toFixed(0) + " days";
          })
          .attr("text-anchor", "middle")
          .call(wrapText, medianAnnoWidth, 13);

  // chartElement
  //   .append("g")
  //   .attr("class", "dots")
  //   .selectAll("circle")
  //   .data(config.data)
  //   .enter()
  //   .append("circle")
  //   .attr("cx", d => xScale(d[valueColumn]))
  //   .attr("cy", (d, i) => i * (barHeight + barGap) + barHeight / 2)
  //   .attr("r", dotRadius);

  // Render bar labels.
  chartWrapper
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0"
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
        top: i * (barHeight + barGap) + "px;"
      })
    )
    .attr("class", d => classify(d[labelColumn]))
    .append("span")
    .text(d => d[labelColumn]);

  // Render bar values.
  // ["shadow", "value"].forEach(function(cls) {
  //   chartElement
  //     .append("g")
  //     .attr("class", cls)
  //     .selectAll("text")
  //     .data(config.data)
  //     .enter()
  //     .append("text")
  //     .attr("x", d => xScale(d[maxColumn]) + 6)
  //     .attr("y", (d, i) => i * (barHeight + barGap) + barHeight / 2 + 3)
  //     .text(d => d[valueColumn].toFixed(1) + "%");
  // });
};
