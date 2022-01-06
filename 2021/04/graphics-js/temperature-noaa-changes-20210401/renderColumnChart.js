var { isMobile } = require("./lib/breakpoints");
var { COLORS, makeTranslate, wrapText, getAPMonth } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");
var fmtYearAbbrev = d => "\u2019" + (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();


// Render a column chart.
module.exports = function(config) {
  // Setup chart container
  var { labelColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3.5 : 9;
  var valueGap = 6;

  var margins = {
    top: 30,
    right: 10,
    bottom: 20,
    left: 34
  };

  var ticksY = 5;
  if (isMobile.matches) {
    ticksY = 5
  }
  var roundTicksFactor = 1;
  var annotationWidth = 60;
  var annotationLineHeight = 16;

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
    // .round(true)
    .padding(0)
    .domain(config.data.map(d => d[labelColumn]));

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
  if (isMobile.matches) {
    max = 5;
  }

  var yScale = d3
    .scaleLinear()
    .domain([-1, max])
    .range([chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues([1980,1990,2000,2010,2020]);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      var num = d == 0 ? 0 : fmtComma(d)
      var pos = d > 0 ? "+" : ""
      return pos + num + "°F"}
      );

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

  var yAxisLabel = isMobile.matches === true ? LABELS.yAxisLabelMobile : LABELS.yAxisLabelDesktop;  

  chartElement.append('text')
    .classed('chart-label-title', true)
    .attr('x', xScale(1981)-5)
    .attr('y', yScale(max)+4)
    .text(yAxisLabel)


  var duration_dates = [      
      { 
        'begin':xScale('1981'),
        'end':xScale('2010')+xScale.bandwidth(),
        'top': yScale(2.23)-5,
        'bottom':yScale(-0.76)+5,
        'text': LABELS.bucket1
      },
      { 
        'begin':xScale('1991'),
        'end':xScale('2020')+xScale.bandwidth(),
        'top': yScale(3.26)-5,
        'bottom':yScale(-0.76)+5,
        'text': LABELS.bucket2
      }
  ];


  var durationBars = chartElement.insert('g','*')
    .attr('class', 'duration')
    .selectAll('rect')
    .data(duration_dates)
    .enter()
      .append('rect')
      .attr('x', d => d['begin'])
      .attr('width', d => d['end'] - d['begin'])
      .attr('y', d => d['top'])
      .attr('height', d=> chartHeight-d["top"]-(chartHeight-d["bottom"]))

  var annoLine = d3
    .line()
    // .curve(d3.curveBasis)
    .x(d => d.x)
    .y(d => d.y)

  chartElement.append("g")
    .attr('class', 'duration')
    .selectAll('rect')
    .data(duration_dates)
    .enter()  
    .append("path")
    .attr("class","anno-line")
    .attr("d", function(d,i) {
      var yOffset = 10;

      if (isMobile.matches) {
        yOffset = 10;
      }

      // if (isMobile.matches && Number(d.x_mobile_offset)) {
      //   thisxOffset = d.x_mobile_offset;
      //   thisyOffset = d.y_mobile_offset;
      // }  else {
      //   thisxOffset = d.xOffset;
      //   thisyOffset = d.yOffset;
      // }
      // if (i === 0) {
        // var aboveBelow = "bottom";
        // var sign = -1;
      // } else {
        var aboveBelow = "top";
        var sign = 1;
      // }
      var coords = [
        {
          x:d["begin"],
          y:d[aboveBelow]+(yOffset*sign)
        },
        {
          x:d["begin"],
          y:d[aboveBelow]
        },
        {
          x:d["begin"]+(d["end"]-d["begin"])/2,
          y:d[aboveBelow]
        },
        {
          x:d["begin"]+(d["end"]-d["begin"])/2,
          y:d[aboveBelow]-(10*sign)
        },
        {
          x:d["begin"]+(d["end"]-d["begin"])/2,
          y:d[aboveBelow]
        },
        {
          x:d["end"],
          y:d[aboveBelow]
        },
        {
          x: d["end"],
          y: d[aboveBelow]+(yOffset*sign)
        }
      ]

      return annoLine(coords);
    })


  chartElement
    .append("g")
    .attr("class","annotations")
    .selectAll("text")
    .data(duration_dates)
    .enter()
    .append("text")
    .attr("x",d => d["begin"]+(d["end"]-d["begin"])/2)
    .attr("y",(d,i) => {
      // if (i==0) {
        // return d["bottom"]+25;
      // } else {
        return d["top"]-15
      // }
    })
    .text(d => d.text)
    // .call(wrapText, annotationWidth, annotationLineHeight);








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
      var pos = d[valueColumn] > 0 ? "pos" : "neg";
      return "bar bar-" + d[labelColumn] + " " + pos;
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

  // chartElement
  //   .append("text")
  //   .attr("class", "annotations-y")      // text label for the x axis
  //   .attr("x", chartWidth + 5)
  //   .attr("y",  10)
  //   .style("text-anchor", "top")
  //   .text("2020: +1.8°F")
  //   .call(wrapText, annotationWidth, annotationLineHeight);

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    // .text(d => d[valueColumn].toFixed(0))
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
