var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;
var skipLabels = ["label", "category", "values", "total"];

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, fmtComma } = require("./lib/helpers");

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData();
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

// Format data for processing.
var formatData = function() {
  DATA.forEach(function(d) {
    d.values = [];
    d.total = 0;

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

    d.total += d[key];

      d.values.push({
        name: key,
        val: d[key]
      })
    }
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
  // Render the charts!

  var MasterContainer = "#column-chart";
  d3.select(MasterContainer).html("");
  var element = document.querySelector(MasterContainer);
  var width = element.offsetWidth;
  // console.log(DATA)

  // DATA.filter(d => d.total)

  // var bigMax  = Total max num of blocks data MAX TOTAl /
  var bigMax = Math.round(Math.max.apply(Math, DATA_BIG.map(function(o) { return o.total; }))/BLOCKSIZE);
  // console.log(bigMax)

  // var MaxnumColumns = bigMax / BLOCKSPERCOLUMN;
  // var blocksize = width / MaxnumColumns

  for (var j = 0; j < DATA.length; j++) {
    d3.select(MasterContainer).append("div")
      .attr("class",`sub graphic g${j}`)

    var container = `.graphic.g${j}`

    renderColumnChart({
      container,
      width,
      bigMax,
      data: [DATA[j]]
    });

  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a column chart.
var renderColumnChart = function(config) {
  // Setup chart container
  var labelColumn = "label";
  var valueColumn = "amt";

  var localMax = config.data[0].total;
  var localBlocks = Math.round(localMax / BLOCKSIZE)

  // console.log(localBlocks)
  // console.log(config.bigMax)
  // var
  var widthRatio = localBlocks / config.bigMax;
  // console.log("-----------")
  // console.log(widthRatio);
  // console.log(config.width*widthRatio)

  var aspectWidth = isMobile.matches ? 16 : 16;
  var aspectHeight = isMobile.matches ? 4 : 4;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 10,
    bottom: 0,
    left: 0
  };

  if (isMobile.matches) {
    margins.right = 0;
  }

  var ticksY = 4;
  var roundTicksFactor = 50;

  // Calculate actual chart dimensions
  var chartWidth = Math.max((config.width*widthRatio),5);
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");


  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  chartWrapper.append("h3")
    .html(function(d){
      return config.data[0].label
    })

  chartWrapper.append("h4")
    .html(function(d){
      console.log(config.data[0].total);
      return `$${config.data[0].total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
    })

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + (2*margins.right))
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 scale objects.
  var yScale = d3
    .scaleBand()
    .range([0,chartHeight])
    .round(true)
    .padding(isMobile.matches ? 0.1 : 0.1)
    .domain(
      config.data.map(d => d.label)
    );

  var floors = config.data.map(
    d => Math.floor(d.values / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max(...ceilings);
  // var max = config.bigMax;

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth-margins.left]);

  // Create D3 axes.
  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .tickFormat(function(d, i) {
      return d;
    });

  // Render bars to chart.
  var bar_w = yScale.bandwidth();
  var num_blocks = isMobile.matches ? BLOCKSPERCOLUMN : BLOCKSPERCOLUMN;
  // var num_blocks = Math.round(bar_w / 20);
  var block_margin = isMobile.matches ? 0.5 : 1;
  var block_w = Math.floor(bar_w / num_blocks) - block_margin;


  // Render axes to chart.
  // chartElement
  //   .append("g")
  //   .attr("class", "y axis")
  //   .attr("transform", makeTranslate(30,-bar_w/2))
  //   .call(yAxis);

  // render the bars
  var bars = chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("g.bar")
    .data(config.data)
    .enter()
    .append("g")
    .attr('transform', function(d) {
              var y_offset = 0;
              if (d.total/10 < num_blocks) {
                  y_offset = (bar_w / 2) - (block_w * (d.total / 20)) - (block_w / 2);
              }
              // return 'translate(' + (yScale(d[labelColumn]) + y_offset + block_margin) + ',0)';
              return 'translate(0,' + (yScale(d[labelColumn]) + y_offset + block_margin) + ')';
          })
          .attr('class', function(d) {
              return 'bar bar-' + d[labelColumn];
          });

  // Add blocks to each group
  bars.selectAll('rect')
      .data(function(d) {

        // total number of blocks
        var totalBlocks = Math.round(d.total/BLOCKSIZE);
        var countUp = 0;
        var buckets = [];

        for (var i = 0; i < d.values.length; i++) {
            var blockBreak = Math.round(d.values[i].val/BLOCKSIZE) + countUp;

            buckets.push(blockBreak);
            countUp = blockBreak;
          }
        // empty array, which will be returned.
        var listOfBlocks = [];

        // create a list from 0 to number of blocks.
        // for each block, see what bucket it should fall into.
        d3.range(totalBlocks).forEach(function(p){
          for (var i = 0; i < buckets.length; i++) {
            if (buckets[i] > p) {
              listOfBlocks.push([p,i])
              break;
            }
          }
        })
        // return d3.range(Math.round(d.total/BLOCKSIZE));
        return listOfBlocks;
      })
      .enter()
      .append('rect')
      .attr('class', function(d) {
        return `block c${d[1]}`;
      })
      .attr('width', block_w)
      .attr('height', block_w)
      .attr('y', function(d,i) {
        var y_pos = (i % num_blocks);
        return y_pos * (block_w + block_margin) + 10;
      })
      .attr('x', function(d,i) {
        var x_pos = Math.floor(i / num_blocks);
        return (x_pos * (block_w + block_margin)) + 15;
      });

  // Render bar values.
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .text(function(d) {
  //             return fmtComma(d.total.toFixed(0));
  //           })
  //           .attr('x', function(d, i) {
  //               return xScale(d[labelColumn]) + (xScale.bandwidth() / 2);
  //           })
  //           .attr('y', function(d) {
  //               var y_pos = Math.round(d.total/BLOCKSIZE) / num_blocks;
  //               var y_offset = Math.floor(y_pos) === 0 ? 5 : 0;
  //               return chartHeight - (y_pos * (block_w + block_margin)) - y_offset - (block_w / 2);
  //           })
  //           .attr('text-anchor', 'middle');
}

//Initially load the graphic
window.onload = onWindowLoaded;
