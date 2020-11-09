var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var pymChild = null;

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, makeTranslate, classify, formatStyle } = require("./lib/helpers");

// initialization
var onWindowLoaded = function() {
  var buttons = document.querySelectorAll("button");
  buttons.forEach(function(b) {
    b.addEventListener('click', onButtonPressed);
  });

  var hasD3Graphic = false;
  if (document.querySelectorAll('.chart').length > 0) {
    hasD3Graphic = true;
  }

  pym.then(child => {
    pymChild = child;

    if (hasD3Graphic) {
      render();
      window.addEventListener("resize", render);
    } else {
      child.sendHeight();
      window.addEventListener("resize", () => child.sendHeight());
    }

    child.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    child.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

// button pressing
var onButtonPressed = function(evt) {
  var btn = evt.target;
  var detail = btn.parentNode.querySelector('.detail');
  var detailID = detail.id;
  detail.classList.toggle('open');
  pymChild.sendHeight();

  var analyticsSection = detail.parentNode.id;
  var analyticsIssue = document.querySelector('.graphic').id;

  switch(detail.classList.contains('open')) {
    case true:
      btn.textContent = btn.dataset.less;
      ANALYTICS.trackEvent(`${ analyticsIssue }-detail-open`, analyticsSection);
      break;
    case false:
      btn.textContent = btn.dataset.more;
      pymChild.scrollParentToChildEl(detailID);
      ANALYTICS.trackEvent(`${ analyticsIssue }-detail-close`, analyticsSection);
      break;
  }
}

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#chart-spending .bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  if (width > 650) {
    width = 650;
  }

  renderBarChart({
    container,
    width,
    data: DATA_CLIMATE_SPENDING
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderBarChart = function(config) {
  // Setup
  var labelColumn = "label";
  var valueColumn = "amt";

  var barHeight = 25;
  var barGap = 1;
  var labelWidth = 65;
  var labelMargin = 6;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 25,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 2;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

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
      var unit = isMobile.matches ? 'T' : ' trillion'
      return '$' + d.toFixed(0) + unit;
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = function() {
    return xAxis;
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
    .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])} ${d.candStatus}`);

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
      return classify(d[labelColumn]) + " " + d.candStatus;
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
    .text(d => '$' + d[valueColumn].toFixed(1) + ' trillion')
    .attr('class', d => d.candStatus)
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
          return -(valueGap + textWidth);
        } else {
          d3.select(this).classed("out", true);
          return valueGap;
        }
      }
    })
    .attr("dy", barHeight / 2 + 3);

    // Update iframe
    if (pymChild) {
      pymChild.sendHeight();
    }
};

// account for image loading
window.onload = onWindowLoaded;
