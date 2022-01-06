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
var textures = require("./lib/textures");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;
  //console.log('overall')
  //console.log(config.data)

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 5,
    right: 33,
    bottom: 20,
    left: 30
  };

  var ticksX = 5;
  var ticksY = 3;
  //var roundTicksFactor = 1;
  //var width = 350;
  
  //console.log(width)
  var width = config.width/2-5;
  //console.log(width)


  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 3;
    width = config.width-5;
  }

  // Calculate actual chart dimensions
  var chartWidth = width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((width * aspectHeight) / aspectWidth) -
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
    .domain([0, 70])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.key;
      })
    )
    .range([
      COLORS.blue1,
      //'#801770'
      '#808080'
    ]);

  var stateTitle = config.category;

  // if (config.category == 'LULUCF'){
    // var colorScale = d3
    // .scaleOrdinal()
    // .domain(
    //   config.data.map(function(d) {
    //     return d.key;
    //   })
    // )
    // .range([
    //   COLORS.blue1,
    // ]);

    stateTitle = 'Projected U.S. Emissions*'


  // }

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
    .attr("class", "graphic-wrapper " + classify(config.category));

  chartWrapper.append("h3")
    .attr("class", "state-title")
    .attr("id",classify(config.category))
    .html(stateTitle)
    .style("width",chartWidth + "px")

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
    .tickValues([new Date('2017,8,1'),new Date('2021,5,1')])
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      //console.log(d)
      // if (isMobile.matches) {
      //   return "\u2019" + yearAbbrev(d);
      // } else {
        //if (yearFull(d) == 2005 || yearFull(d) == 2030)
        return yearFull(d);
      //}
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    // .ticks(ticksY)
    // .tickValues([0,4,8])
    .tickFormat(function(d, i){
          return d
    });

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  //if (config.category == 'Power'){
     chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);
  //}

  // chartElement
  //   .append("rect")
  //   .attr("x",xScale(new Date('2018,1,1')))
  //   .attr("y",0)
  //   .attr("width",chartWidth - (xScale(new Date('2018,1,1'))))
  //   .attr("height",chartHeight)
  //   .attr("fill",function (d){
  //      var background = "#F0F0F0"
  //       //}
        
  //       var texture1 = textures
  //         .lines()
  //         .orientation("7/8")
  //         .size(20)
  //         .strokeWidth(4)
  //         .background(background)
  //         .stroke('#ffffff');

  //       containerElement.select("svg").call(texture1);
  //       return texture1.url()
  //   })

    // chartElement
    // .append("text")
    // .attr("x",xScale(new Date('2018,1,1')) + 5)
    // .attr("y",15)
    // .attr("class","preliminary_label")
    // .text("Projections")
 

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

    chartElement.append('text')
    .attr("class", "tick")
    .classed('chart-label-title', true)
    .attr('x', xScale(new Date('2005, 01, 01')))
    .attr('y', yScale(8)+4)
    .text('billion tons/year')

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
    //.curve(d3.curveStepAfter)
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
    .attr("fill", d => colorScale(d.key) + '73')
    .attr("id",d=>classify(d.key))
    .attr("d", areaGen)



    // Render lines to chart.
  var line = d3
    .line()
    //.curve(d3.curveStepAfter)
    .x(d => xScale(d.data[dateColumn]))
    .y(d => yScale(d[1]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(config.category))
    .attr("stroke", d => COLORS.blue1)
    //.attr("stroke-width", d => d.key == 'LULUCF' ? 1 : 2)
    .attr("d", function (d){
      //console.log(d)
      return line(d.slice(0,2))
    });

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(config.category))
    .attr("id",d=>classify(d.key))
    .attr("stroke", d=> colorScale(d.key))
    //.attr("stroke-width", d => d.key == 'LULUCF' ? 1 : 2)
    .attr("stroke-dasharray",(3,3))
    .attr("d", function (d){
      //console.log(d)
      return line(d.slice(1))
    });

    var lastItem = d => d[d.length - 4];
    var firstItem = d => d[0];
    //var offsetLastItem = d => d[d.length - 1];
    var secondItem = d => d[1];
    //var firstItem = d => d[0];

  //console.log(lastItem(config.data.flat()).data['date']);

  var lastDate = lastItem(config.data.flat()).data.date;
  var lastValue = lastItem(config.data.flat())[1];

  //var offsetLastValue = offsetLastItem(config.data.flat())[1];

  var firstDate = firstItem(config.data.flat()).data.date;
  var firstValue = firstItem(config.data.flat())[1];

  var secondDate = secondItem(config.data.flat()).data.date;
  var secondValue = secondItem(config.data.flat())[1];

  var currentRateItem = d=>d[d.length-1]
  var currentRateValue = currentRateItem(config.data.flat())[1];


  var percentChange = 100*((lastValue - firstValue) / firstValue)

  var stateTitleSelected = document.querySelector(`h3#${classify(config.category)}`)
  stateTitleSelected.innerHTML = `${stateTitle}<br><span style="font-size:80%;letter-spacing:0.07em;color:${COLORS.blue1}">2005-2030 change: ${Math.round(percentChange)}%</span>` 

function getRadius() {
  if (isMobile.matches) return "3";
  return "3";
}

chartElement
    .append("g")
    .attr("class", "end-circles")
    .append("circle")
    .attr("class", "circle " + classify(config.category))
    .attr("fill", COLORS.blue1)
    .attr("stroke",'#ffffff')
    .attr("cx", xScale(firstDate))
    .attr("cy", yScale(firstValue))
    .attr("r", getRadius())

chartElement
    .append("g")
    .attr("class", "end-circles")
    .append("circle")
    .attr("class", "circle " + classify(config.category))
    .attr("stroke", COLORS.blue1)
    .attr("fill",'#ffffff')
    .attr("cx", xScale(lastDate))
    .attr("cy", yScale(lastValue))
    .attr("r", getRadius())


  chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("x", xScale(lastDate) + 7)
    .attr("y", yScale(lastValue) + 3)
    .attr("fill",COLORS.blue1)
    .text(lastValue.toFixed(2))
    .attr("font-style","italic")
    .style("font-weight","normal") 

  // chartElement
  //   .append("g")
  //   .attr("class", "value offsets")
  //   .append("text")
  //   .attr("x", xScale(lastDate) + 5)
  //   .attr("y", yScale(offsetLastValue) - 5)
  //   .attr("fill",'#801770')
  //   .text('Carbon offsets*')
  //   .call(wrapText,50,13)

  chartElement
    .append("text")
    .attr("x", xScale(lastDate)-70)
    .attr("y", yScale(currentRateValue)+15)
    .attr("class","preliminary_label")
    .style("fill",'white')
    .attr("stroke",'#808080')
    .text("Current rate")
    .call(wrapText,65,12)

       chartElement
    .append("text")
    .attr("x",xScale(new Date('2018,1,1'))+10)
    .attr("y",yScale(3))
    .attr("class","preliminary_label")
    .style("fill",'white')
    .attr("stroke",COLORS.blue1)
    .text("High ambition scenario")
    .call(wrapText,75,12)

  chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("x", xScale(firstDate)-30)
    .attr("y", yScale(firstValue)+3)
    .attr("fill",COLORS.blue1)
    .text(firstValue.toFixed(2))
    .style("font-weight","bold") 

  chartElement
    .append("g")
    .attr("class", "end-circles")
    .append("circle")
    .attr("class", "circle " + classify(config.category))
    .attr("fill", COLORS.blue1)
    .attr("stroke",'#ffffff')
    .attr("cx", xScale(secondDate))
    .attr("cy", yScale(secondValue))
    .attr("r", getRadius())

  chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("x", xScale(secondDate) + 3)
    .attr("y", yScale(secondValue) - 5)
    .text(secondValue.toFixed(2))
    .style("font-weight","normal")


};
