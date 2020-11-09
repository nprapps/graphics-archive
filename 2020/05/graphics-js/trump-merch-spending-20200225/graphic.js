console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, makeTranslate, wrapText } = require("./lib/helpers");

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

// Initialize the graphic.
var onWindowLoaded = function() {
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

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
  // Render the chart!
  var container = "#column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderColumnChart({
    container,
    width,
    data: DATA
  });

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

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 7;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 37
  };

  var ticksY = 4;
  var roundTicksFactor = 50;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
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

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .range([0, chartWidth])
    .round(true)
    .padding(0.1)
    .domain(
      config.data.map(d => d[labelColumn])
    );

  var floors = config.data.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max(...ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var monthList = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function(d, i) {
      var d = d.toString()
      var month = d.slice(d.length - 2, d.length)
      var year = d.slice(0, d.length - 2)

      if (parseInt(month)%12 == 1) {
        var textStr = monthList[parseInt(month) - 1]
        if (parseInt(month) == 1) {
          textStr += " " + year
        }
        return textStr;
      }
      return ""
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => "$" + d/1000000 + "M");

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


  // remove extra ticks
  chartElement.selectAll(".x.axis .tick").each(function(el, ind) {
  	if (d3.select(this).select("text").html() == "") {
  		d3.select(this).classed("hide-line", true)
  	}
  })

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

   console.log(config.data)

  // Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d[labelColumn]))
    .attr("y", d => d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn]))
    .attr("width", xScale.bandwidth())
    .attr("height", d => d[valueColumn] < 0
      ? yScale(d[valueColumn]) - yScale(0)
      : yScale(0) - yScale(d[valueColumn])
    )
    .attr("class", function(d) {
      return "bar bar-" + d[labelColumn];
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





  // add annotations

  chartElement.append("line")
  	.attr("x1",xScale(201609 ) - 3)
  	.attr("x2",xScale(201609 -2) - 1)
  	.attr("y1",yScale(4500000))
  	.attr("y2",yScale(4500000))
  	.attr("class", 'pointer-line')

  	var septText = "September"
  	if (isMobile.matches) {
  		septText = "Sept."
  	}


  chartElement.append("text")
  	.attr("x",xScale(201609 -2) - 1 -2)
  	.attr("y",yScale(4500000) + 3)
  	.attr("class", 'pointer-text right-align')
  	.text(septText + " 2016: $5.3 million")
  	.call(wrapText, 120, 16)


  chartElement.append("line")
  	.attr("x1",xScale(202003 ) - 3)
  	.attr("x2",xScale(202003 - 2) - 12)
  	.attr("y1",yScale(4000000))
  	.attr("y2",yScale(4000000))
  	.attr("class", 'pointer-line')


  chartElement.append("text")
  	.attr("x",xScale(202003 - 2) - 12 - 4)
  	.attr("y",yScale(4000000))
  	.attr("class", 'pointer-text right-align')
  	.text("March 2020: $4.7 million")
  	.call(wrapText, 100, 16)


  chartElement.append("text")
  	.attr("x",8 + xScale(201611 ) + (xScale(201508) / 2))
  	.attr("y",yScale(5000000))
  	.attr("class", 'pointer-text-election')
  	.text("November 2016:")
  	.call(wrapText, 150, 16)


   chartElement.append("text")
  	.attr("x",8 + xScale(201611 ) + (xScale(201508) / 2))
  	.attr("y",yScale(5000000) + 16)
  	.attr("class", 'pointer-text-election')
  	.text("Trump elected president")
  	.call(wrapText, 220, 16)


  chartElement.append("line")
  	.attr("x1",xScale(201611 ) + (xScale(201508) / 2))
  	.attr("x2",xScale(201611 ) + (xScale(201508) / 2))
  	.attr("y1",yScale(0))
  	.attr("y2",yScale(5500000))
  	.attr("class", 'pointer-line-election')




  // Render bar values.
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .text(d => "$" + (d[valueColumn]/1000000).toFixed(1) + "M")
  //   // .text(d => "$" + fmtComma(parseInt(d[valueColumn].toFixed(0))))
  //   .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
  //   .attr("y", d => yScale(d[valueColumn]))
  //   .attr("dy", function(d) {
  //     var textHeight = this.getBBox().height;
  //     var $this = d3.select(this);
  //     var barHeight = 0;

  //     if (d[valueColumn] < 0) {
  //       barHeight = yScale(d[valueColumn]) - yScale(0);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return -(textHeight - valueGap / 2);
  //       } else {
  //         $this.classed("out", true);
  //         return textHeight + valueGap;
  //       }
  //     } else {
  //       barHeight = yScale(0) - yScale(d[valueColumn]);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return textHeight + valueGap;
  //       } else {
  //         $this.classed("out", true);
  //         return -(textHeight - valueGap / 2);
  //       }
  //     }
  //   })
  //   .attr("text-anchor", "middle");
};

//Initially load the graphic
window.onload = onWindowLoaded;
