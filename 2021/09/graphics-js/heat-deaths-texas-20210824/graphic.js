console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global config
var BINS = [];
var max = 120;
var binsCount;
var binIncrement;

// Global vars
var pymChild = null;
var binnedDataLeft = [];

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-array/dist/d3-array.min"),
};

var { COLORS, makeTranslate, classify, fmtComma } = require("./lib/helpers");

// Initialize the graphic.
var onWindowLoaded = function () {
  formatData();
  render();

  window.addEventListener("resize", formatData);
  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    pymChild.sendHeight();

    pymChild.onMessage("on-screen", function (bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function (data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

var leftLargestBin;
var chartHeight;
var blockHeight;
var blockGap;

// Format graphic data for processing by D3.
var formatData = function () {
  BINS = [];
  binsCount = 60;
  if (isMobile.matches) {
    binsCount = 60;
  }
  binIncrement = max / binsCount;

  for (i = 0; i <= binsCount; i++) {
    BINS.push((i * binIncrement).toFixed(0));
  }

  var numBins = BINS.length - 1;

  binnedDataLeft = [];

  // init the bins
  for (var i = 0; i < numBins; i++) {
    binnedDataLeft[i] = [];
  }

  DATA = DATA.filter(d => d.toxicity != "N/A");
  DATA = DATA.sort((a, b) => (a.toxicity < b.toxicity ? 1 : -1));

  // put states in bins
  DATA.forEach(function (d) {
    if (d.toxicity != null) {
      var state = d.name;

      for (var i = 0; i < numBins; i++) {
        if (d.toxicity >= BINS[i] && d.toxicity < BINS[i + 1]) {
          binnedDataLeft[i].unshift(state);
          break;
        }
      }
    }
  });

  blockHeight = 12;
  blockGap = 1;

  if (isMobile.matches) {
    blockHeight = 10;
    blockGap = 1;
  }

  // Determine largest bin
  // leftLargestBin = Math.max.apply(
  //   null,
  //   binnedDataLeft.map(b => b.length)
  // );

  leftLargestBin = 15;

  var chartHeightLeft = (blockHeight + blockGap) * leftLargestBin;

  chartHeight = chartHeightLeft;
};

// Render the graphic(s). Called by pym with the container width.
var render = function () {
  // Render the chart!
  var leftContainer = "#left-block-histogram";
  var leftelement = document.querySelector(leftContainer);
  var leftwidth = leftelement.offsetWidth;
  renderBlockHistogram({
    container: leftContainer,
    width: leftwidth,
    data: binnedDataLeft,
    bins: BINS,
    largestBin: leftLargestBin,
    chartHeight,
    blockHeight,
    blockGap,
    binIncrement,
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderBlockHistogram = function (config) {
  // Setup
  var margins = {
    top: 20,
    right: 14,
    bottom: 40,
    left: 16,
  };

  var ticksY = 4;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Legend
  var colorScale = d3.scaleThreshold().domain([LABELS.min, 0, 5, 10]).range([
    "#000000", // never used
    COLORS.yellow5,
    COLORS.orange4,
    "#ba341a",
    COLORS.red1,
  ]);

  var legendWrapper = containerElement
    .append("div")
    .attr("class", "key-wrap")
    .classed("numeric-scale", true);
  if (LABELS.title_key) {
    legendWrapper.append("h3").html(LABELS.title_key);
  }
  var legendElement = legendWrapper.append("ul").attr("class", "key");

  colorScale.domain().forEach(function (key, i) {
    var keyItem = legendElement.append("li").classed("key-item", true);

    keyItem.append("b").style("background", colorScale(key));

    var keyLabel = key + "℉";
    if (key > 0) {
      keyLabel = "+" + keyLabel;
    }
    keyItem.append("label").text(keyLabel);
    if (i === colorScale.domain().length - 1) {
      keyItem
        .append("label")
        .attr("class", "end-label")
        .text(`+${LABELS.max}℉`);
    }
  });

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", config.chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(config.bins.slice(0, -1).filter(d => +d >= 70))
    .range([0, chartWidth])
    .padding(0.1);

  // var xScaleLinear = d3.scaleLinear().domain([0, max]).range([0, chartWidth]);

  var yScale = d3
    .scaleLinear()
    .domain([0, config.largestBin])
    .range([config.chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function (d, i) {
      // if (isMobile.matches) {
      //   if (i % 10 == 0) {
      //     return fmtComma(parseInt(d)) + "℉";
      //   }
      // } else {
      //   if (i % 2 == 0) {
      //     return fmtComma(parseInt(d)) + "℉";
      //   }
      // }
      if (d % 10 === 0) {
        return fmtComma(parseInt(d)) + "℉";
      }
    });

  var yAxis = d3.axisLeft().scale(yScale).ticks(ticksY);

  // Render axes to chart.
  var xAxisElement = chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, config.chartHeight))
    .call(xAxis);

  d3.select(".x.axis .domain").remove();

  xAxisElement
    .append("text")
    .attr("transform", makeTranslate(chartWidth / 2, margins.bottom - 3))
    .style("font-style", "italic")
    .style("font-size", isMobile.matches ? 11 : 12)
    .attr("fill", "currentColor")
    .text(LABELS.title_x);

  // Render grid to chart.
  var yAxisGrid = function () {
    return yAxis;
  };

  var yAxisElement = chartElement
    .append("g")
    .attr("class", "y grid")
    .call(yAxisGrid().tickSize(-chartWidth, 0));

  yAxisElement
    .select(".tick:last-of-type text")
    .clone()
    .attr("x", "0.5em")
    .attr("class", "shadow")
    .text(LABELS.title_y)
    .clone()
    .attr("class", "label")
    .text(LABELS.title_y);

  var bandwidth = xScale.bandwidth();
  var shift = -(bandwidth / 2) - (bandwidth * 0.1) / 2;
  var tickShift = function (d, i) {
    var existing =
      this.getAttribute("transform").match(/translate\(([^)]+)\)/)[1];
    existing = existing.split(",").map(Number);
    existing[0] += shift;
    existing[1] += 3;
    return makeTranslate(...existing);
  };

  // Shift tick marks
  chartElement.selectAll(".x.axis .tick").attr("transform", tickShift);

  var lastTick = chartElement
    .select(".x.axis")
    .append("g")
    .attr("class", "tick")
    .attr("transform", function () {
      var lastBin = xScale.domain()[xScale.domain().length - 1];

      var x = xScale(lastBin) + bandwidth + (bandwidth * 0.1) / 2;
      var y = 3;
      return makeTranslate(x, y);
    });

  lastTick
    .append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", 0)
    .attr("y2", 6);

  lastTick
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", 0)
    .attr("y", 9)
    .attr("dy", "0.71em")
    .attr("fill", "currentColor")
    .text(function () {
      var t = config.bins[config.bins.length - 1];
      return fmtComma(parseInt(t)) + "℉";
    });

  // highlight the ticks
  var xTickLines = chartElement.selectAll(".x .tick line");

  xTickLines.each(function (el, ind) {
    if (ind % 5 == 0) {
      d3.select(this).classed("highlight-tick", true);
    }
  });

  // Render annotations
  var annotations = chartElement.append("g").attr("class", "annotations");
  var expected = 38.9;
  var roundUp = (max - expected) % config.binIncrement;
  if (roundUp == 0) {
    roundUp = config.binIncrement;
  }
  // expected += roundUp

  // annotations
  //   .append("line")
  //   .attr("class", "axis-0")
  //   .attr("x1", xScaleLinear(expected))
  //   .attr("y1", -margins.top)
  //   .attr("x2", xScaleLinear(expected))
  //   .attr("y2", config.chartHeight);

  // if (binnedDataLeft == config.data) {
  //   annotations
  //     .append("text")
  //     .attr("class", "label-top")
  //     .attr("x", xScaleLinear(expected) + 2)
  //     .attr("dx", -10)
  //     .attr("text-anchor", "end")
  //     .attr("y", -10)
  //     .html(LABELS.annotation_left);

  // // can add in median if we want to

  // var leftLungDataset = DATA.filter(d=>parseFloat(d.toxicity) > 0)
  // var leftLungMeasurements = []
  // leftLungDataset.forEach(function(el, ind) {
  //   leftLungMeasurements.push(el.toxicity)
  // })
  // var leftLungMedian = d3.median(leftLungMeasurements)

  // annotations
  //  .append("line")
  //  .attr("class", "axis-0")
  //  .attr("x1", xScaleLinear(leftLungMedian))
  //  .attr("y1", -margins.top)
  //  .attr("x2", xScaleLinear(leftLungMedian))
  //  .attr("y2", config.chartHeight);
  // }

  // Render bins to chart.
  var bins = chartElement
    .selectAll(".bin")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", (d, i) => "bin bin-" + i)
    .attr("transform", function (d, i) {
      return BINS[i] >= 40
        ? makeTranslate(xScale(BINS[i]), 0)
        : makeTranslate(0, 0);
    });

  bins
    .selectAll("rect")
    .data(function (d, i) {
      // add the bin index to each row of data so we can assign the right color
      var formattedData = [];
      Object.keys(d).forEach(function (k) {
        var v = d[k];
        var w = DATA.filter(j => j.name == v);
        formattedData.push({
          key: k,
          value: v,
          parentIndex: i,
          weightLeft: w[0].toxicity,
          diff: w[0].diffFarenheit,
        });
      });
      var data = formattedData.sort((a, b) => b.diff - a.diff);
      return data;
    })
    .enter()
    .append("rect")
    .attr("width", xScale.bandwidth())
    .attr("x", 0)
    .attr(
      "y",
      (d, i) =>
        config.chartHeight - (config.blockHeight + config.blockGap) * (i + 1)
    )
    .attr("height", config.blockHeight)
    .attr("class", function (d) {
      var overweightClass = "under";
      var expectedWeight;
      if (binnedDataLeft == config.data) {
        expectedWeight = expected;
        if (d.weightLeft > expectedWeight) {
          overweightClass = "over";
        }
      }

      return classify(d.value) + " " + overweightClass;
    })
    .attr("fill", function (d) {
      // console.log(d.diff, colorScale(d.diff))
      return colorScale(d.diff);
    });
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
