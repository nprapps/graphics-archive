/*
 * Render a line chart.
 */

var {
  COLORS,
  classify,
  makeTranslate,
  wrapText,
  fmtComma,
  getAPMonth
} = require("./lib/helpers");

var { isMobile } = require("./lib/breakpoints");

var { yearAbbrev, yearFull, dayYear, dateFull, monthDay } = require("./lib/helpers/formatDate");

var fmtNumber = d => d.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

module.exports = function(config) {
  /*
   * Setup
   */
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 5,
    right: 20,
    bottom: 20,
    left: 75
  };

  var ticksX = 8;
  var ticksY = 3;
  var roundTicksFactor = 5;

  var annotationXOffset = 0;
  var annotationYOffset = -20 + (margins.top - 25);
  var annotationWidth = 80;
  var annotationLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    ticksX = 5;
    ticksY = 3;
    margins.right = 25;
    annotationXOffset = -6;
    annotationYOffset = -20;
    annotationWidth = 72;
    annotationLineHeight = 12;
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

  /*
   * Create D3 scale objects.
   */
  var xScale = d3
    .scaleTime()
    .domain(extent)
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
    .domain([0, 600000])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      COLORS.orange3,
      COLORS.teal3
    ]);

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  /*
   * Create D3 axes.
   */
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
        return monthDay(d);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => fmtComma(d));

  /*
   * Render axes to chart.
   */
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  /*
   * Render grid to chart.
   */

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxis
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxis
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

  /*
   * Render 0 value line.
   */
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  // Render y-axis label
  chartElement
    .append("text")
    .text("Total state COVID-19 cases")
    .attr("class", "y-label")
    .attr('transform', 'translate(-60,' + (chartHeight / 2) + ')rotate(-90)');

  /*
   * Render lines to chart.
   */
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  var annoLine = d3
    .line()
    .x(d => d.x)
    .y(d => d.y)

  var area = d3
    .area()
    .y0(d => yScale(0))
    .y1(d => yScale(d[valueColumn]))
    .x(d => xScale(d[dateColumn]));

  chartElement
    .append("g")
    .attr("class", "areas")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("d", d => area(d.values))
    .attr("fill", "#F1C696")

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", function(d, i) {
      return "line " + classify(d.name);
    })
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", function(d, i) {
      var last = d.values[d.values.length - 1];
      return xScale(last[dateColumn]) + 5;
    })
    .attr("y", function(d) {
      var last = d.values[d.values.length - 1];
      return yScale(last[valueColumn]) + 3;
    });

  /*
   * Render annotations.
   */
  var annotation = chartElement
    .append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter();

  annotation
    .append("path")
    .attr("class", "anno-line")
    .attr("d", function(d) {
      var thisxOffset = d.xOffset;
      var thisyOffset = d.yOffset;
      var coords;
      // var heightOffset = d.annotate;

      if (d.rightOffset) {
        var extraOffset = annotationWidth + 40;
        thisxOffset = d.xOffset + annotationWidth + 100;
        var endOffset = annotationWidth;

        coords = [
          {
            x:xScale(d[dateColumn]),
            y:yScale(d[valueColumn])
          },
          // {
          //   x: xScale(d[dateColumn]) + thisxOffset + extraOffset,
          //   y: yScale(d[valueColumn])
          // },
          {
            x: xScale(d[dateColumn]) + thisxOffset + extraOffset,
            y: yScale(d[valueColumn]) + thisyOffset
          },
          {
            x: xScale(d[dateColumn]) + thisxOffset + endOffset - 30,
            // x: xScale(d[dateColumn]),
            y: yScale(d[valueColumn]) + thisyOffset
          }
        ]
      } else {
        var extraOffset = -50;
        var endOffset = 0;

        coords = [
          {
            x:xScale(d[dateColumn]),
            y:yScale(d[valueColumn])
          },
          // {
          //   x: xScale(d[dateColumn]) + thisxOffset + extraOffset,
          //   y: yScale(d[valueColumn])
          // },
          // {
          //   x: xScale(d[dateColumn]) + thisxOffset + extraOffset,
          //   y: yScale(d[valueColumn]) + thisyOffset
          // },
          {
            // x: xScale(d[dateColumn]) + thisxOffset + endOffset,
            x: xScale(d[dateColumn]),
            y: yScale(d[valueColumn]) + thisyOffset + 30
          }
        ]
      }

      return annoLine(coords);
    })

    var annotDivs = chartWrapper.append("div")
      .attr("id","anno-divs")

    annotDivs.selectAll("div")
      .data(config.annotations)
      .enter()
      .append("div")
      .attr("class","anno-div")
      .style("left",function(d){
        // if (isMobile.matches && Number(d.x_mobile_offset)) {
        //   thisxOffset = d.x_mobile_offset;
        // }  else {
        //   thisxOffset = d.xOffset;
        // }

        return xScale(d[dateColumn]) + d.xOffset + annotationXOffset + "px"
      })
      .style("top",function(d) {
        // if (isMobile.matches && Number(d.x_mobile_offset)) {
        //   thisyOffset = d.y_mobile_offset;
        // }  else {
        //   thisyOffset = d.yOffset;
        // }
        return yScale(d[valueColumn]) + d.yOffset + annotationYOffset + "px"
      })
      .html(function(d){
        var annotationDate = dateFull(d[dateColumn]);
        var annotationCases = d[valueColumn];
        var cases = `<h4>${fmtNumber(annotationCases)} confirmed cases</h4>`;

        var hasCustomLabel = d.label != null && d.label.length > 0;
        var annotationLabel = hasCustomLabel ? d.label : null;

        var hasActionLabel = d.action != null && d.action.length > 0;

        if (hasActionLabel && hasCustomLabel) {
          return `
            <div class="header">
              <p>${annotationDate}</p>
              ${cases}
            </div>
            <div class="anno-action">
              <p>${d.action}</p>
            </div>
            <div class="anno-body">
              <p>${annotationLabel}</p>
            </div>
          `;
        } else if (hasActionLabel) {
          return `
            <div class="header">
              <p>${annotationDate}</p>
              ${cases}
            </div>
            <div class="anno-action">
              <p>${d.action}</p>
            </div>
          `;
        }

        return `
          <div class="header">
            <p>${annotationDate}</p>
            ${cases}
          </div>
          <div class="anno-body">
            <p>${annotationLabel}</p>
          </div>
        `;
      })

  annotation
    .append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => colorScale(d.series))
    .attr("r", 3);


  annotation
    .append("circle")
    .attr("class", "icon-dots")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => colorScale(d.series))
    .attr("r", isMobile.matches ? 10 : 12);

  annotation
    .append("text")
    .attr("class", "icon-num")
    .attr("x", d => xScale(d[dateColumn]) - 4)
    .attr("y", d => yScale(d[valueColumn]) + 4)
    .text(d => d.icon);

  // annotation
  //   .append("text")
  //   .html(function(d) {
  //     var hasCustomLabel = d.label != null && d.label.length > 0;
  //     var text = hasCustomLabel ? d.label : dateFull(d[dateColumn]);
  //     var value = d[valueColumn].toFixed(0);
  //     return text + " " + value;
  //   })
  //   .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annotationXOffset)
  //   .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annotationYOffset)
  //   .call(wrapText, annotationWidth, annotationLineHeight);
};
