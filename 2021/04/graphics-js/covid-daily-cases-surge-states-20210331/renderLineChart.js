var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, fmtComma, wrapText, getAPMonth } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 15,
    right: 80,
    bottom: 60,
    left: 30,
  };

  if (!isMobile.matches){
    if (config.state != 'Michigan' && config.state != 'New Jersey'){
      margins.left = 50;
    }
  }
  

  var ticksX = 5;
  var ticksY = 3;
  var width = config.width/2;
  var roundTicksFactor = 10000;
  var labelLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    ticksY = 3;
    labelLineHeight = 11;
    margins.right = 5;
    margins.left = 30;
    //width = config.width;
  }

  // Calculate actual chart dimensions
  var chartWidth = width - margins.left - margins.right;
  // var chartHeight =
  //   Math.ceil((config.width * aspectHeight) / aspectWidth) -
  //   margins.top -
  //   margins.bottom;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.element);
  //containerElement.html("");

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
  var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, 15000])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.orange5,
      COLORS.orange3
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";
    var lineData = [ config.data[1] ]; // rolling average
  // if (config.state == 'Michigan'){

  //   var legendWrapper = d3.select('.key-wrap');
  //   var legendElement = d3.select('.key');

  //   legendElement.innerHTML = ""

  //   legend = legendElement
  //     .selectAll("g")
  //     .data(config.data)
  //     .enter()
  //     .append("li")
  //     .attr("class", d => "key-item " + classify(d.name));

  //     legend.append("b").style("background-color", d => colorScale(d.name));

  //     legend.append("label").text(d => d.name);
  // }



  

  // Create the root SVG element.

  var statePops ={//'Florida': 21477737,
                  'Pennsylvania': 12801989,
                  //'New Jersey': 8882190,
                  'Michigan' : 9986857,
                  'Connecticut': 3565287,
                  'Minnesota': 5639632,
                  'Vermont': 623989,
                  'North Dakota':762062,
                  'Puerto Rico':3193694,
                  'Illinois':12671821,
                  'Nebraska': 1934408} 

  var lastItem = d => d.values[d.values.length - 1];
    var twoWeeksItem = d => d.values[d.values.length - 15];

  var percentChange = 100*(((lastItem(lineData[0]).amt - twoWeeksItem(lineData[0]).amt))/twoWeeksItem(lineData[0]).amt)
  //var stateTitle = document.querySelector(".state-title")
  //var stateTitleText = stateTitle.innerHTML
  //stateTitle.innerHTML = (`${stateTitleText} (+${Math.round(percentChange)}% over past 14 days)`)

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  chartWrapper.append("h3")
    .attr("class", "state-title")
    .html(function(d){
      if (config.state == 'Michigan'){
        return `${config.state} <br><span id="twoweeks" style="color:#707070">(14-day change: +${Math.round(percentChange)}%)</span>`
      }

      return `${config.state} <br><span id="twoweeks" style="color:#707070">(+${Math.round(percentChange)}%)</span>`
    })
    .style("width",chartWidth + "px")
    .append("span")
    .style("width",chartWidth + "px")

  if (isMobile.matches){
    chartWrapper.append("h3")
      .attr("class", "subtitle")
      .html(`<strong>${fmtComma(lastItem(config.data[1]).amt)} new cases/day</strong> <br> ${Math.round(lastItem(config.data[1]).amt/(statePops[config.state]/100000))} per 100k <br> <span style="color:#A9A9A9"></span>`)
      .style("width",chartWidth + "px")
      .append("span")
      .style("width",chartWidth + "px")
  }

  

  

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
      if (getAPMonth(d) == 'April' && yearFull(d)=='2021'){
        return
      }
      
      return getAPMonth(d);
    });



  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    //.ticks(ticksY)
    .tickValues([0,7500,15000])
    .tickFormat(function (d) {
      if (d == 0){
        return 0;
      }

      return d/1000 + "k"

    });
    //.tickFormat(d=> isMobile.matches ? (d/1000 + "k") : fmtComma(d));

  // Render axes to chart.

  if (config.state == 'Michigan' || !isMobile.matches){

    

    chartElement
      .append("g")
      .attr("class", "y axis")
      .call(yAxis);
    
  }

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  

  // Render grid to chart.

  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("rect")
    .attr("x",xScale(new Date(twoWeeksItem(lineData[0]).date)))
    .attr("y",0)
    .attr("width",chartWidth - (xScale(new Date(twoWeeksItem(lineData[0]).date))))
    .attr("height",chartHeight)
    .attr("fill","#F5F5F5")

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

  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  

  // render area to chart
  var areaData = [ config.data[0] ]; // new tests
  var area = d3.area()
    .defined(function(d) {
      return d[dateColumn] != null && !isNaN(d[valueColumn]);
    })
    .curve(d3.curveStepBefore)
    .x(d => xScale(d[dateColumn]))
    .y0(chartHeight)
    .y1(d => yScale(d[valueColumn]));

  

  // Render lines to chart.

  var line = d3
    .line()
    // .curve(d3.curveStepBefore)
    // .defined(d => !isNaN(d.value))
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  // console.log(config.state + ": " + lineData[0])
  // console.log(config.state + ": " + lastItem(lineData[0]).amt)
  // console.log(config.state + ": " + twoWeeksItem(lineData[0]).amt)

  

  //console.log(stateTitle)

    // chartElement
    // .append("text")
    // .attr("x",xScale(new Date(twoWeeksItem(lineData[0]).date))+2)
    // .attr("y",15)
    // .attr("class","preliminary_label")
    // .text(Math.round(percentChange) + "%")

  chartElement
    .append("g")
    .attr("class", "area")
    .selectAll("path")
    .data(areaData)
    .enter()
      .append("path")
      .attr("d", d => area(d.values));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(lineData)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values.filter(function(c) {
      return c.amt != null;
    })));

  var lastItem = d => d.values[d.values.length - 1];

  if (!isMobile.matches){
    chartElement
      .append("g")
      .attr("class", "value")
      .selectAll("text")
      .data(lineData)
      .enter()
      .append("text")
      .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
      .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
      .html(function(d) {
        var item = lastItem(d);
        var value = item[valueColumn];
        var label = `<strong>${fmtComma(value)} new cases/day</strong> (${Math.round(value/(statePops[config.state]/100000))} per 100k)`;

        return label;
      })
      .call(wrapText, margins.right - 5, labelLineHeight);

  }

  //if (isMobile.matches){
    chartElement
    .append("g")
    .attr("class", "end-circles")
    .selectAll("circle")
    .data(lineData)
    .enter()
    .append("circle")
    .attr("class", d => "circle")
    .attr("fill", COLORS.orange2)
    .attr("stroke", "#ffffff")
    .attr("cx", function (d) {
      return xScale(lastItem(d)[dateColumn]);
    })
    .attr("cy", d => yScale(lastItem(d)[valueColumn]))
    .attr("r", 3);
  //}


};
