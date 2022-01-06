var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {


  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 100,
    bottom: 20,
    left: 30
  };

  var annotationWidth = 100;
  var annotationLineHeight = 13; 


  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 80;
    annotationWidth = 75;
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
  // var max = Math.max.apply(null, ceilings);
  var max = 25000000

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
      COLORS.blue5,
      COLORS.blue1,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key" + oneLine)
  //   .selectAll("g")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("class", d => "key-item " + classify(d.name));

  // legend.append("b").style("background-color", d => colorScale(d.name));

  // legend.append("label").text(d => d.name);

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
      // if (isMobile.matches) {
        // return "\u2019" + yearAbbrev(d);
      // } else {
        return yearFull(d);
      // }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      return d/1000000
    });

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

  var yAxisLabel = isMobile.matches === true ? LABELS.yAxisLabelMobile : LABELS.yAxisLabelDesktop;  
  
  chartElement.append('text')
    .classed('chart-label-title', true)
    .attr('x', xScale(new Date('1906'))-5)
    .attr('y', yScale(max)+4)
    .text(yAxisLabel)

  

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

  // var line = d3
  //   .line()
  //   .defined(function(d) {
  //     return typeof d[valueColumn] != "undefined";
  //   })
  //   .x(d => xScale(d[dateColumn]))
  //   .y(d => yScale(d[valueColumn]));

  
  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values.filter(p=> p[valueColumn])));

  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 7)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 5)
    .text(function(d) {
      var item = lastItem(d);
      return d.name
    })
    .call(wrapText, annotationWidth, annotationLineHeight);

chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(config.data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(lastItem(d)[dateColumn]))
    .attr("cy", d => yScale(lastItem(d)[valueColumn]))
    .attr("r",3)
    .attr("fill", d => colorScale(d.name));    


  // render benchmark
  chartElement
    .append("line")
    .attr("class", "benchmark-line")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", yScale(18019692))
    .attr("y2", yScale(18019692));

  // render annotations
  var duration_dates = [      
      { 
        'begin':xScale(new Date('1906')),
        'end':xScale(new Date('1921')),
        'top': yScale(22942804)-5,
        'bottom':yScale(11711022)+5,
        'text': LABELS.bucket1
      },
      // { 
      //   'begin':xScale(new Date('1922')),
      //   'end':xScale(new Date('2020')),
      //   'top': yScale(22942804)-5,
      //   'bottom':yScale(5000000)+5,
      //   'text': LABELS.bucket2
      // }
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
        var aboveBelow = "bottom";
        var sign = -1;
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
        return d["bottom"]+10;
      // } else {
        // return d["top"]-15
      // }
    })
    .text(d => d.text)
    .call(wrapText, 50, annotationLineHeight);


  chartElement.append('text')
    .attr("class", "benchmark-value")
    .attr('x', xScale(new Date('2020'))+5)
    .attr('y', yScale(18019692)+3)
    .text("Benchmark")
};
