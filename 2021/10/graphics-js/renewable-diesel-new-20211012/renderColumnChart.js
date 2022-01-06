var { isMobile } = require("./lib/breakpoints");
var { COLORS, makeTranslate, wrapText, fmtComma, classify } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

var fmtYearAbbrev = d => (d + "").slice(-2);

// Render a column chart.
module.exports = function(config) {
  // Setup chart container
  var { labelColumn, valueColumn, catColumn } = config;
  console.log( labelColumn, valueColumn, catColumn);

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 50
  };

  var ticksY = 4;
  var roundTicksFactor = 2;

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
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .range([0, chartWidth])
    .round(true)
    .padding(0.1)
    .domain(config.data.map(d => d[labelColumn]));

  var xScaleBars = d3
    .scaleBand()
    .domain(config.data.map(d => d[labelColumn]))
    .range([0, xScale.bandwidth()])
    .padding(0.1);

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

  // Create D3 axes.
 //var getBillion = function(d) {return 'billion' + d3.format('f')(d)};

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function (d) {
      if (isMobile.matches) return "\u2019" + fmtYearAbbrev(d);
      return d;
    });

var ticks = [0,2,4,6]



  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .tickValues(ticks)

    .tickFormat(function(d) {
  if (d == 0) {
    return d;
  } else {
    return d + " billion";
  }
  //if (isMobile.matches) return (d +'B');
    // return d;
});
    //.tickFormat( d => (d + ' billion'))
   // .tickFormat(function (d) {
   //  ( d => (d + ' billion'))
    //  if (isMobile.matches) return (d +'B');
  //    return d;
    //.ticks(ticksY)
    //.tickFormat(d => fmtComma(d))


  // draw bg shade
  var bandGap = xScale("2021") - xScale("2020") - xScale.bandwidth();
  console.log(bandGap);
  chartElement
    .append("rect")
    .attr("class", "projected")
    .attr("x", (xScale("2021") - (bandGap / 2)))
    .attr("y", 0)
    // .attr("width", (xScale("2024") - xScale("2021") + xScale.bandwidth() + bandGap))
    .attr("width", (chartWidth - xScale("2021") + (bandGap / 2)))
    .attr("height", chartHeight);


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

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxis
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );




//
 if (config.block) {
    var block = chartElement.insert('g','*')
      .attr('class', 'bar bar-date')
      .selectAll('rect')
      .data(config.block)
      .enter()
        .append('rect')
        .attr('x', d => xScale(d['begin']))
        .attr('width', d => xScale(d['end']) - xScale(d['begin']))
        .attr('y', 0)
        .attr('height', chartHeight);
  }




  // Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d[labelColumn]))
    .attr("y", d => (d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn])))
    .attr("width", xScale.bandwidth())

    .attr("height", d =>
      d[valueColumn] < 0
        ? yScale(d[valueColumn]) - yScale(0)
        : yScale(0) - yScale(d[valueColumn])
    )
    .attr("class", function(d) {
      console.log(d[catColumn])
      return "bar bar-" + d[labelColumn] + " " +  classify(d["category"]);
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

  // Render bar values.


var yearMark = chartElement
    .append('g')
    .attr('class', 'bar-date');


yearMark
    .append('text')
    .classed('chart-label', true)
    .attr('x', xScale(2021))
    .attr('y', yScale(5.3))
    .attr('text-anchor', 'begin')
    .html(d => 'Projected')
    .attr('fill','#666')
    .call(wrapText, isMobile.matches ? 80 : 180, 40);



  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => d[valueColumn].toFixed(1))
    .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d[valueColumn]))
    .attr("dy", function(d) {
      var textHeight = this.getBBox().height;
      var $this = d3.select(this);
      var barHeight = 0;

      if (d[valueColumn] < 0) {
        barHeight = yScale(d[valueColumn]) - yScale(0);

        if (textHeight + valueGap * 2 < barHeight) {
          $this.classed("in", true);
          return -(textHeight - valueGap / 2);
        } else {
          $this.classed("out", true);
          return textHeight + valueGap;
        }
      } else {
        barHeight = yScale(0) - yScale(d[valueColumn]);

        if (textHeight + valueGap * 2 < barHeight) {
          $this.classed("in", true);
          return textHeight + valueGap;
        } else {
          $this.classed("out", true);
          return -(textHeight - valueGap / 2);
        }
      }
    })
    .attr("text-anchor", "middle");
};
