var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min")
};

var { makeTranslate, classify, formatStyle } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a bar chart.
module.exports = function(config) {
  // Setup

  var { labelColumn, minColumn, maxColumn } = config;

  var categories = Object.keys(config['data'][0]).filter(function(d) {
    if ([ "label", "label_fmt", "min", "max" ].indexOf(d) < 0) {
      return d;
    }
  });

  var barHeight = 80;
  var barGap = 10;
  var barOffset = 2;
  var labelWidth = 250;
  var labelMargin = 10;
  var valueMinWidth = 30;
  var dotRadius = 6;

  var tickValues = [ 0, 25, 50, 75, 100 ];

  var margins = {
    top: 0,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin
  };


  if (isMobile.matches) {
    barHeight = 45;
    barOffset = 5;
    labelMargin = 20;
    labelWidth = 0;
    margins['left'] = (labelWidth + labelMargin);
  }

  // if (isPromo) {
  //     barHeight = 35;
  //     labelWidth = 100;
  // }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  if (isMobile.matches) {
    containerElement.append('h4')
      .html(config['data'][0]['label_fmt'])
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

  // Render bar labels (desktop only)
  if (!isMobile.matches) {
    containerElement
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
      // .attr("class", d => classify(d[labelColumn]))
      .append("span")
      .html(d => d[labelColumn]);
  }

  // Create D3 scale objects.
  var min = tickValues[0];
  var max = tickValues[tickValues.length - 1];

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues(tickValues)
    .tickFormat(d => d + "%");

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
    .attr("y1", (d, i) => i * (barHeight + barGap) + (barHeight / 2) + barOffset)
    .attr("y2", (d, i) => i * (barHeight + barGap) + (barHeight / 2) + barOffset);

  // Render dots to chart.
  var dots = chartElement.append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data(categories)
    .enter()
      .append("g")
        .attr("class", d => classify(d));

  dots.selectAll("circle")
    .data(d => config.data.map(o => o[d]))
    .enter()
      .append("circle")
      .attr("cx", d => xScale(d))
      .attr("cy", (d, i) => i * (barHeight + barGap) + barHeight / 2 + barOffset)
      .attr("r", dotRadius);

  // add dot annotations
  chartElement.select('.dots .overall')
    .selectAll('line')
    .data(d => config.data.map(o => o["Overall"]))
    .enter().append('line')
      .attr('x1', function(d) {
        return xScale(d);
      })
      .attr('x2', function(d) {
        return xScale(d);
      })
      .attr('y1', function(d, i) {
        return i * (barHeight + barGap) + (barHeight / 2) + barOffset - dotRadius;
      })
      .attr('y2', function(d, i) {
        return i * (barHeight + barGap) + (barHeight / 2) + barOffset - dotRadius - 8;
      });

  // Render bar values.
  var cls = "value";
  var dotValues = chartElement.append('g')
      .attr('class', cls)
      .selectAll('g')
      .data(categories)
      .enter().append('g')
          .attr('class', function(d) {
              return classify(d);
          });
  dotValues.selectAll('text')
      .data(d => config.data.map(o => o[d]))
      .enter().append('text')
        .attr('x', function(d, i) {
          return xScale(d);
        })
        .attr('y', function(d,i) {
          var offset = 20;
          var yPos = i * (barHeight + barGap) + (barHeight / 2) + barOffset;
          return yPos + offset;
        })
        .text(function(d) {
          return d + '%';
        });

  chartElement.selectAll('.value .overall text')
    .attr('dy', -35)
    .text(function() {
      var thisText = d3.select(this).text();
      return 'Overall: ' + thisText;
    });

  // adjust label placement for some questions
  // if (isMobile) {
  //   if (config['idx'] == 0) {
  //     chartElement.select('.value .democrats text')
  //       .attr('dx', 17);
  //   }
  // } else {
  //   chartElement.select('.value .democrats text:nth-child(1)')
  //       .attr('dx', 15);
  // }
};
