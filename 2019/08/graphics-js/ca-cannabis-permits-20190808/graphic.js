var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { COLORS, classify, fmtComma, formatStyle, makeTranslate, wrapText } = require("./lib/helpers");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var initComplete = false;

var pymChild = null;
pym.then(function(child) {

  pymChild = child;
  // child.sendHeight();

  render();
  window.addEventListener("resize", render);

  child.onMessage("on-screen", function(bucket) {
    ANALYTICS.trackEvent("on-screen", bucket);
  });
  child.onMessage("scroll-depth", function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });

});

var render = function() {
  var container = document.querySelector(".graphic");
  //remove fallback
  // container.innerHTML = "";
  var width = container.offsetWidth;

  if (!initComplete) {
    initMap({
      container: "#map",
      data: DATA
    });
  }

  renderBarChart({
    container: "#bar-chart",
    width: width,
    data: DATA
  });

  pymChild.sendHeight();
};

var initMap = function(config) {
  var colorScale = d3.scaleThreshold()
    .domain([ 1, 150, 300, 450, 600, 1000 ])
    .range([ '#eee', '#c5dfdf', '#89b7b6', '#538f8d', '#266766', '#0b403f' ]);

  var legendElement = d3.select('ul.key');
  var legendDomain = [ 0, 1, 150, 300, 450, '600+' ]; // yes, this is kind of gross
  legendDomain.forEach(function(d, i) {
    var li = legendElement.append('li')
      .attr('class', 'key-item');
    li.append('b')
      .attr('style', 'background-color: ' + colorScale.range()[i]);
    li.append('label')
      .text(d);
  });

  var containerElment = d3.select(config.container);
  var mapElement = containerElment.select("svg");

  var annotation = mapElement.append('g')
    .attr('class', 'annotation');

  var paths = mapElement.selectAll("path")
    .attr('fill', function(d) {
      var t = d3.select(this);
      var id = t.attr('id');
      var fill = colorScale.range()[0];
      var bbox = this.getBBox();
      var centroid = [ bbox.x + bbox.width/2, bbox.y + bbox.height/2 ];

      config.data.forEach(function(v,k) {
        if (v.id == id) {
          var thisData = config.data[k];
          var county = thisData['county']
          var permits = thisData['valid_permits'];

          fill = colorScale(permits);

          if (thisData['annotate'] == 'yes') {
            annotation.append('text')
              .text(county + ': ' + permits)
              .attr('x', id == '06023' ? 370 : 60)
              .attr('y', id == '06023' ? centroid[1] + 10 : centroid[1] - 20)
              .call(wrapText, 200, 36);

            if (id == '06023') {
              annotation.append('line')
                .attr('x1', 350)
                .attr('x2', centroid[0])
                .attr('y1', centroid[1])
                .attr('y2', centroid[1]);
            }
          }
        }
      })

      return fill;
    });

  initComplete = true;
};


// Render a bar chart.
var renderBarChart = function(config) {
  // Setup
  var labelColumn = "county";
  var valueColumn = "valid_permits";

  var chartData = config.data.filter(function(d,i) {
    return d[valueColumn] > 100;
  });

  var barHeight = 24;
  var barGap = 5;
  var labelWidth = 130;
  var labelMargin = 10;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 15,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 200;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * chartData.length;

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
  var floors = chartData.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = chartData.map(
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
      return fmtComma(d);
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
    .data(chartData)
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
    .data(chartData)
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
    .data(chartData)
    .enter()
    .append("text")
    .text(d => d[valueColumn].toFixed(0) + ' permits')
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

  if (pymChild) {
    pymChild.sendHeight();
  }
};

//first render
// render();
