var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { yearFull, monthDay } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 25,
    right: 120,
    bottom: 20,
    left: 40
  };

  var ticksX = 5;
  var ticksY = 4;
  var roundTicksFactor = 40;
  //var width = 350;
  
  //console.log(width)
  //var width = config.width/2-10;
  //console.log(width)


  // Mobile
  if (isMobile.matches) {
    ticksX = 3;
    ticksY = 4;
    margins.right = 100;
    //width = config.width/2-5;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  //containerElement.html("");
  //console.log(config.data)
  var dates = config.data[0].map(d => {
    return d.data.date
  })

  var extent = [dates[0], dates[dates.length - 1]];

  //console.log(extent)

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  // var values = config.data.reduce(
  //   (acc, d) => {console.log(d); acc.concat(d[valueColumn]),
  //   []}
  // );

  // var floors = values.map(
  //   v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  // );
  // var min = Math.min.apply(null, floors);

  // if (min > 0) {
  //   min = 0;
  // }

  // var ceilings = values.map(
  //   v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  // );
  // var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([0, 100])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.key;
      })
    )
    .range([
      COLORS.teal2,
      COLORS.teal4,
      COLORS.orange4,
      ` #989898`,
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

  // chartWrapper.append("h3")
  //   .attr("class", "state-title")
  //   .html(config.category)
  //   .style("width",chartWidth + "px")

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
    //.ticks(ticksX)
    .tickValues([new Date("2020-08-14T00:00:00"),
                new Date("2020-09-18T00:00:00"),
                new Date("2020-12-09T00:00:00"),
                new Date("2021-01-19T00:00:00"),
                new Date("2021-03-11T00:00:00"),
                /*new Date("2021-03-30T00:00:00")*/])
    .tickFormat(function(d, i) {

      //console.log(d)
      // if (isMobile.matches) {

      //   if (monthDay(new Date(d)) == 'March 11'){
      //     return 'Mar. 11'
      //   }

      //   if (monthDay(new Date(d)) == 'March 30'){
      //     return
      //   }

      //   else {
      //     return monthDay(new Date(d));
      //   }
      // //   return "\u2019" + yearAbbrev(d);
      // } else {
        //console.log(d)
        return monthDay(new Date(d));

      //}
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i){
          return d + '%'
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

  // Render 0 value line.

  // if (min < 0) {
  //   chartElement
  //     .append("line")
  //     .attr("class", "zero-line")
  //     .attr("x1", 0)
  //     .attr("x2", chartWidth)
  //     .attr("y1", yScale(0))
  //     .attr("y2", yScale(0));
  // }

  // Render lines to chart.
   var areaGen = d3
    .area()
    //.curve(d3.curveStepBefore)
    .x(d => xScale(d.data[dateColumn]))
    .y0(function (d) {
      return yScale(d[0]);
    })
    .y1(d => yScale(d[1]));

    chartElement
    .append("g")
    .attr("class","areas")
    .selectAll("path")
    .data(config.data)
    .join("path")
      .attr("fill", d => colorScale(d.key) + '59')//'73')
      .attr("d", areaGen)

    // Render lines to chart.
  var line = d3
    .line()
    //.curve(d3.curveStepAfter)
    .x(d => xScale(d.data[dateColumn]))
    .y(d => yScale(d[1]));

  // chartElement
  //   .append("g")
  //   .attr("class", "lines")
  //   .selectAll("path")
  //   .data(config.data)
  //   .enter()
  //   .append("path")
  //   .attr("class", d => "line " + classify(config.category))
  //   .attr("stroke", d => 'white')//colorScale(config.category))
  //   .attr("d", d => line(d));

    var lastItem = d => d[d.length - 1];

  //console.log(lastItem(config.data.flat()).data['date']);

  var lastDate = lastItem(config.data.flat()).data.date;

  var lastData = lastItem(config.data.flat()).data

  // var lastValueUnsure = lastData['Unsure']
  // var lastValueNo = lastData['No']
  // var lastValueYes = lastData['Yes']
  // var lastValueVaccinated = lastData['Already Vaccinated']

  var labels = ["Unsure","No","Yes","Already vaccinated"]
  var balanceLines = [98,90,40,0]

  //var balanceLine = 100;

  labels.forEach(function(label,index){
    var lastValue = lastData[label]

    
    //console.log(lastValue)

    if (index == 3){
      var yPosition = (balanceLines[index] + lastValue)/2
      chartElement
        .append("g")
        .attr("class", `value ${classify(label)}`)
        .append("text")
        .attr("x", xScale(lastDate) + 5)
        .attr("y", yScale(yPosition))
        .text(`${label}: ${Math.round(lastValue)}%`)
        .attr("fill",colorScale[index])
        .style("font-weight","normal")
        .call(wrapText,margins.right+3,isMobile.matches ? 13 : 16)
    }

    else {
      var yPosition = (balanceLines[index] + (100-lastValue))/2
      
      chartElement
        .append("g")
        .attr("class", `value ${classify(label)}`)
        .append("text")
        .attr("x", xScale(lastDate) + 5)
        .attr("y", yScale(yPosition))
        .text(`${label}: ${Math.round(lastValue)}%`)
        .attr("fill",colorScale[index])
        .style("font-weight","normal")
    }
    
    
  })

  chartElement
        .append("g")
        .attr("class", `value date`)
        .append("text")
        .attr("x", xScale(lastDate) + 5)
        .attr("y", yScale(100) -15)
        .text(`As of March 30:`)
        .style("font-weight","normal!important")
        //.call(wrapText,margins.right+5,isMobile.matches ? 13 : 16)

  // chartElement
  //   .append("text")
  //   .attr("class", `text`)
  //   .attr("x", xScale(lastDate) + 5)
  //   .attr("y", yScale(yPosition))
  //   .text(`${label}: ${Math.round(lastValue)}%`)
  //   .attr("fill",colorScale[index])
  //   .style("font-weight","normal")

  

  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .append("text")
  //   .attr("x", xScale(lastDate) + 5)
  //   .attr("y", yScale(100-lastValueNo))
  //   .text(`No: ${Math.round(lastValueNo)}%`)
  //   .attr("fill","#a9a9a9")
  //   .style("font-weight","normal")

function getRadius() {
  if (isMobile.matches) return "3";
  return "4";
}

// chartElement
//     .append("g")
//     .attr("class", "end-circles")
//     .selectAll("circle")
//     .data(config.data)
//     .enter()
//     .append("circle")
//     .attr("class", "circle " + classify(config.category))
//     .attr("fill", COLORS.teal3)
//     .attr("stroke",'#ffffff')
//     .attr("cx", xScale(lastDate))
//     .attr("cy", yScale(100-lastValueUnsure))
//     .attr("r", getRadius())


   
};
