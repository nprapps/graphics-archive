var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var skipLabels = [ 'label', 'category', 'values', 'total' ];

var { COLORS, classify, formatStyle, makeTranslate, wrapText } = require("./lib/helpers");

var pymChild;
var dataSeries = [];

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();

console.clear();

var d3 = {
  ...require("d3-array"),
  ...require("d3-axis"),
  ...require("d3-interpolate/dist/d3-interpolate"),
  ...require("d3-scale"),
  ...require("d3-selection"),
  ...require("d3-shape/dist/d3-shape")
};

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData(window.DATA);
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });

    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

// Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    var y0 = 0;

    d.values = [];
    d.total = 0;

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

      var y1 = y0 + d[key];
      d.total += d[key];

      d.values.push({
        name: key,
        y0: y0,
        y1: y1,
        val: d[key]
      });

      y0 = y1;
    }
  });

  DATA_GROWTH.forEach(function(d) {
    d.amt = Number(d.amt);
  });

  DATA_RATE.forEach(function(d) {
    d.date = new Date(d.date, 0, 1);
  });

  // Restructure tabular data for easier charting.
  for (var column in DATA_RATE[0]) {
    if (column == "date") continue;

    dataSeries.push({
      name: column,
      values: DATA_RATE.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }
};

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
  var container = "#graphic";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var containerElement = d3.select(container);
  containerElement.html("");

  var gutterWidth = 41;
  var numCols = isMobile.matches ? 1 : 2;
  var graphicWidth = Math.floor((width - (gutterWidth * (numCols - 1))) / numCols);

  var growthBarHeight = isMobile.matches ? 45 : 100;
  var growthBarGap = 5;
  var rateMaxHeight = ((growthBarHeight + growthBarGap) * 2) - growthBarGap;
  if (isMobile.matches) {
    rateMaxHeight = rateMaxHeight * 2.5;
  }

  // Render the chart!
  var rateElement = containerElement.append('div')
    .attr('class', 'chart growth');

  renderBarChart({
    container: container + ' .chart.growth',
    width: graphicWidth,
    data: DATA_GROWTH,
    title: LABELS.hed_growth,
    barHeight: growthBarHeight,
    barGap: growthBarGap
  });

  var rateElement = containerElement.append('div')
    .attr('class', 'chart rate');

  renderLineChart({
    container: container + ' .chart.rate',
    width: graphicWidth,
    data: dataSeries,
    title: LABELS.hed_rate,
    maxHeight: rateMaxHeight
  });

  // renderGroupedStackedColumnChart({
  //   container: container + ' .chart.rate',
  //   width: graphicWidth,
  //   data: DATA,
  //   title: LABELS.hed_rate,
  //   maxHeight: rateMaxHeight
  // });

  containerElement.selectAll('.chart')
    .attr('style', function(d,i) {
      var c = '';
      if (numCols > 1) {
        c += 'float: right; ';

        if (i % numCols > 0) {
          var thisGutterWidth = Math.floor((gutterWidth - 1) / 2);

          c += 'width: ' + (graphicWidth + thisGutterWidth) + 'px; ';
          c += 'padding-right: ' + thisGutterWidth + 'px; ';
          c += 'border-right: 1px solid #eee; ';
          c += 'margin-right: ' + thisGutterWidth + 'px; ';
        } else {
          c += 'width: ' + graphicWidth + 'px; ';
        }
      }
      return c;
    });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a grouped stacked column chart.
var renderGroupedStackedColumnChart = function(config) {
  // Setup
  var labelColumn = "label";

  var valueGap = 6;

  var margins = {
    top: 5,
    right: 1,
    bottom: 40,
    left: 0
  };

  var ticksY = 5;
  var roundTicksFactor = 50;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = config.maxHeight;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  containerElement.append('h3')
    .text(config.title);

  // Create D3 scale objects.
  var xScale = d3.scaleBand()
    .domain(config.data.map(d => d.category))
    .range([0, chartWidth])
    .padding(0.1);

  var xScaleBars = d3.scaleBand()
    .domain(config.data.map(d => d[labelColumn]))
    .range([0, xScale.bandwidth()])
    .padding(0.1);

  var values = config.data.map(d => d.total);
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

  var yScale = d3.scaleLinear()
    .domain([ min, max ])
    .range([ chartHeight, 0 ]);

  var colorScale = d3.scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(function(d) {
        if (skipLabels.indexOf(d) == -1) {
          return d;
        }
      })
    )
    .range(["#787878", COLORS.blue3, "#ccc"]);

  // Render the legend.
  if (colorScale.domain().length > 1) {
    var legend = containerElement
      .append("ul")
      .attr("class", "key")
      .selectAll("g")
      .data(colorScale.domain())
      .enter()
      .append("li")
      .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

    legend.append("b").style("background-color", d => colorScale(d));

    legend.append("label").text(d => d);
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
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 axes.
  var xAxis = d3.axisBottom()
    .scale(xScale)
    .tickFormat(d => d);

  var yAxis = d3.axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d + '%');

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis category")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement.selectAll(".x.axis.category .tick line").remove();
  chartElement
    .selectAll(".x.axis.category text")
    .attr("y", 35)
    .attr("dy", 0)
    .call(wrapText, xScale.bandwidth(), 13);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  // Render grid to chart.
  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );

  // Render bars to chart.
  xScale.domain().forEach(function(c, k) {
    var categoryElement = chartElement.append("g").attr("class", classify(c));

    var columns = categoryElement
      .selectAll(".columns")
      .data(config.data.filter(d => d.category == c))
      .enter()
      .append("g")
      .attr("class", "column")
      .attr("transform", d => makeTranslate(xScale(d.category), 0));

    // axis labels
    var xAxisBars = d3.axisBottom()
      .scale(xScaleBars)
      .tickFormat(d => d);
    columns
      .append("g")
      .attr("class", "x axis bars")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxisBars);

    // column segments
    var bars = columns
      .append("g")
      .attr("class", "bar")
      .attr("transform", d => makeTranslate(xScaleBars(d[labelColumn]), 0));

    bars
      .selectAll("rect")
      .data(d => d.values)
      .enter()
      .append("rect")
      .attr("y", d => d.y1 < d.y0 ? yScale(d.y0) : yScale(d.y1))
      .attr("width", xScaleBars.bandwidth())
      .attr("height", d => Math.abs(yScale(d.y0) - yScale(d.y1)))
      // .style("fill", d => colorScale(d.name))
      .attr("class", d => classify(d.name));

    // Render values to chart.
    bars
      .selectAll("text")
      .data(d => d.values)
      .enter()
      .append("text")
      .text(d => d.val.toFixed(1))
      .attr("class", d => classify(d.name))
      .attr("x", d => xScaleBars.bandwidth() / 2)
      .attr("y", function(d) {
        var textHeight = this.getBBox().height;
        var barHeight = Math.abs(yScale(d.y0) - yScale(d.y1));

        var barCenter =
          yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;
        var centerPos = barCenter + textHeight / 2;

        if (textHeight + valueGap * 2 > barHeight) {
          d3.select(this).classed("hidden", true);
          return centerPos - 3;
        } else {
          return centerPos;
        }
      });
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
};

// Render a bar chart.
var renderBarChart = function(config) {
  // Setup
  var labelColumn = "label";
  var valueColumn = "amt";

  var barHeight = config.barHeight;
  var barGap = config.barGap;
  var labelWidth = 50;
  var labelMargin = 10;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 15,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 1;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = ((barHeight + barGap) * config.data.length) - barGap;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  containerElement.append('h3')
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
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Create D3 scale objects.
  var floors = config.data.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max.apply(null, ceilings);

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d) {
      return d.toFixed(0) + "%";
    });

  // // Render axes to chart.
  // chartElement
  //   .append("g")
  //   .attr("class", "x axis")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = function() {
    return xAxis;
  };

  // chartElement
  //   .append("g")
  //   .attr("class", "x grid")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(-chartHeight, 0, 0)
  //       .tickFormat("")
  //   );

  //Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn]))
    .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("height", barHeight)
    .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])}`);

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
        left: "0"
      })
    )
    .selectAll("li")
    .data(config.data)
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
    .attr("class", function(d) {
      return classify(d[labelColumn]);
    })
    .append("span")
    .text(d => d[labelColumn]);

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => d[valueColumn].toFixed(1) + "% growth")
    .attr("x", d => xScale(d[valueColumn]))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("dx", function(d) {
      var xStart = xScale(d[valueColumn]);
      var textWidth = this.getComputedTextLength();

      // Negative case
      if (d[valueColumn] < 0) {
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
          return -valueGap;
        } else {
          d3.select(this).classed("out", true);
          return valueGap;
        }
      }
    })
    .attr("dy", barHeight / 2 + 3);
};

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  var dateColumn = "date";
  var valueColumn = "amt";

  var margins = {
    top: 5,
    right: 60,
    bottom: 20,
    left: 35
  };

  var ticksX = 4;
  var ticksY = 5;
  var roundTicksFactor = 10;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = config.maxHeight;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  if (config.title) {
    containerElement.append('h3')
      .text(config.title);
  }

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

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

  // if (min > 0) {
  //   min = 0;
  // }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
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
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      return fmtYearFull(d);
      // if (isMobile.matches) {
      //   return "\u2019" + fmtYearAbbrev(d);
      // } else {
      //   return fmtYearFull(d);
      // }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d + '%');

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
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    // .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  var dotWrapper = chartElement.append('g')
    .attr('class', 'dots')
    .selectAll('g')
    .data(config.data)
    .enter()
      .append('g')
      .attr('class', d => classify(d.name));

  dotWrapper
    .selectAll('circle')
    .data(d => d.values)
    .enter()
      .append('circle')
      .attr('r', 4)
      .attr('cx', d => xScale(d[dateColumn]))
      .attr('cy', d => yScale(d[valueColumn]));

  dotWrapper
    .selectAll('text')
    .data(d => d.values)
    .enter()
      .append('text')
      .text(d => d[valueColumn].toFixed(1) + '%')
      .attr('x', d => xScale(d[dateColumn]))
      .attr('y', d => yScale(d[valueColumn]))
      .attr('dy', 17);

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
      .append("text")
      .attr("x", d => xScale(lastItem(d)[dateColumn]) + 10)
      .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
      .text(function(d) {
        var item = lastItem(d);
        var value = item[valueColumn];
        var label = value.toFixed(1) + '%';

        label = d.name + ": " + label;

        // return label;
        return d.name;
      });
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
