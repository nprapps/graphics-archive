console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global config
var BINS = [];
var max = 1800;
var binsCount;
var binIncrement;




// Global vars
var pymChild = null;
var binnedDataRight = [];
var binnedDataLeft = [];

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-array/dist/d3-array.min")
};

var { makeTranslate, classify, fmtComma } = require("./lib/helpers");

// Initialize the graphic.
var onWindowLoaded = function() {

  formatData();
  render();

  window.addEventListener("resize", formatData);
  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    pymChild.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};


var rightLargestBin;
var leftLargestBin;
var chartHeight;
var blockHeight;
var blockGap;

// Format graphic data for processing by D3.
var formatData = function() {

  BINS = []
  binsCount = 90
  if (isMobile.matches) {
    binsCount = 60
  }
  binIncrement = max/binsCount

  for (i=0; i<=binsCount; i++) {
    BINS.push((i * binIncrement).toFixed(0))
  }


  var numBins = BINS.length - 1;

  binnedDataRight = []
  binnedDataLeft = []

  // init the bins
  for (var i = 0; i < numBins; i++) {
    binnedDataRight[i] = [];
    binnedDataLeft[i] = [];
  }

  DATA = DATA.filter(d => d.left_amt != "N/A" && d.right_amt != "N/A")
  DATA = DATA.sort((a, b) => (a.left_amt < b.left_amt) ? 1 : -1)


  // put states in bins
  DATA.forEach(function(d) {
    if (d.right_amt != null) {
      var state = d.name;

      for (var i = 0; i < numBins; i++) {
        if (d.right_amt >= BINS[i] && d.right_amt < BINS[i + 1]) {
          binnedDataRight[i].unshift(state);
          break;
        }
      }
    }
    if (d.left_amt != null) {
      var state = d.name;

      for (var i = 0; i < numBins; i++) {
        if (d.left_amt >= BINS[i] && d.left_amt < BINS[i + 1]) {
          binnedDataLeft[i].unshift(state);
          break;
        }
      }
    }
  });


  blockHeight = 7;

  if (isMobile.matches) {
    blockHeight = 4
  }


  blockGap = 1;

  // Determine largest bin
  rightLargestBin = Math.max.apply(
    null,
    binnedDataRight.map(b => b.length)
  );


  // Determine largest bin
  leftLargestBin = Math.max.apply(
    null,
    binnedDataLeft.map(b => b.length)
  );

  

  var chartHeightRight = (blockHeight + blockGap) * rightLargestBin;
  var chartHeightLeft = (blockHeight + blockGap) * leftLargestBin;


  chartHeight = Math.max(chartHeightRight, chartHeightLeft)

};




// Render the graphic(s). Called by pym with the container width.
var render = function() {
  console.log("begin render")




  // Render the chart!
  var rightContainer = "#right-block-histogram";
  var leftContainer = "#left-block-histogram";
  var rightelement = document.querySelector(rightContainer);
  var leftelement = document.querySelector(leftContainer);
  var rightwidth = rightelement.offsetWidth;
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
    binIncrement
  });
  renderBlockHistogram({
    container: rightContainer,
    width: rightwidth,
    data: binnedDataRight,
    bins: BINS,
    largestBin: rightLargestBin,
    chartHeight,
    blockHeight,
    blockGap,
    binIncrement
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderBlockHistogram = function(config) {
  // Setup

  var margins = {
    top: 20,
    right: 25,
    bottom: 25,
    left: 10
  };

  var ticksY = 4;


  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // add in title
  containerElement.append("h3")
  .html(config.data == binnedDataRight ? "Mass of right lungs" : "Mass of left lungs")


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
    .domain(config.bins.slice(0, -1))
    .range([0, chartWidth])
    .padding(0.1);

  var xScaleLinear = d3
    .scaleLinear()
    .domain([0, max])
    .range([0, chartWidth])

  var yScale = d3
    .scaleLinear()
    .domain([0, config.largestBin])
    .range([config.chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function(d, i){
      if (i%10==0) {
       return fmtComma(parseInt(d)) + "g"
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, config.chartHeight))
    .call(xAxis);

  d3.select(".x.axis .domain").remove();


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

  var bandwidth = xScale.bandwidth();
  var shift = -(bandwidth / 2) - (bandwidth * 0.1) / 2;
  var tickShift = function(d, i) {
    var existing = this.getAttribute("transform").match(
      /translate\(([^)]+)\)/
    )[1];
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
    .attr("transform", function() {
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
    .text(function() {
      var t = config.bins[config.bins.length - 1];
      return fmtComma(parseInt(t)) + "g"
    });


  // highlight the ticks 
  var xTickLines = chartElement.selectAll(".x .tick line")

  console.log(xTickLines)

  xTickLines.each(function(el, ind) {
    console.log(el, ind)
    if (ind % 10 == 0) {
      d3.select(this).classed("highlight-tick", true)
    }
  })

  // Render annotations
    var annotations = chartElement.append("g").attr("class", "annotations");
    var expected = 400 
    // right lung is heavier
    if (binnedDataRight == config.data) {
      expected = 450
    }
    var roundUp = (max-expected)%config.binIncrement 
    if (roundUp == 0) {
      roundUp = config.binIncrement
    }
    expected += roundUp

 

    annotations
      .append("line")
      .attr("class", "axis-0")
      .attr("x1", xScaleLinear(expected))
      .attr("y1", -margins.top)
      .attr("x2", xScaleLinear(expected))
      .attr("y2", config.chartHeight);

  if (binnedDataLeft == config.data) {

    annotations
      .append("text")
      .attr("class", "label-top")
      .attr("x", xScaleLinear(expected) + 2)
      .attr("dx", 1)
      .attr("text-anchor", "begin")
      .attr("y", -10)
      .html(LABELS.annotation_left);

    // // can add in median if we want to

    // var leftLungDataset = DATA.filter(d=>parseFloat(d.left_amt) > 0)
    // var leftLungMeasurements = []
    // leftLungDataset.forEach(function(el, ind) {
    //   leftLungMeasurements.push(el.left_amt)
    // })
    // var leftLungMedian = d3.median(leftLungMeasurements)

     // annotations
     //  .append("line")
     //  .attr("class", "axis-0")
     //  .attr("x1", xScaleLinear(leftLungMedian))
     //  .attr("y1", -margins.top)
     //  .attr("x2", xScaleLinear(leftLungMedian))
     //  .attr("y2", config.chartHeight);
  }


  if (binnedDataRight == config.data) {

    annotations
      .append("text")
      .attr("class", "label-top")
      .attr("x", xScaleLinear(expected) + 2)
      .attr("dx", 1)
      .attr("text-anchor", "begin")
      .attr("y", -10)
      .html(LABELS.annotation_right);
  }

  console.log(BINS)

  // Render bins to chart.
  var bins = chartElement
    .selectAll(".bin")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", (d, i) => "bin bin-" + i)
    .attr("transform", function(d, i) {
      console.log(d, i)
      return makeTranslate(xScale(BINS[i]), 0)
    });


  bins
    .selectAll("rect")
    .data(function(d, i) {
      // add the bin index to each row of data so we can assign the right color
      var formattedData = []
      Object.keys(d).forEach(function(k) {
        var v = d[k];
        var w = DATA.filter(j => j.name == v)
        formattedData.push({ key: k, value: v, parentIndex: i, weightLeft: w[0].left_amt, weightRight: w[0].right_amt});
      });
      return formattedData;
    })
    .enter()
    .append("rect")
    .attr("width", xScale.bandwidth())
    .attr("x", 0)
    .attr("y", (d, i) => config.chartHeight - (config.blockHeight + config.blockGap) * (i + 1))
    .attr("height", config.blockHeight)
    .attr("class", function(d) {
      var overweightClass = "under"
      var expectedWeight
      if (binnedDataLeft == config.data) {
        expectedWeight = 400;
        if (d.weightLeft > expectedWeight) {
          overweightClass = 'over'
        }
      }
      if (binnedDataRight == config.data) {
        expectedWeight = 450;
        if (d.weightRight > expectedWeight) {
          overweightClass = 'over'
        }
      }

      return classify(d.value) + " " + overweightClass 
    });




};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;