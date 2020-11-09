var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var { yearFull, yearAbbrev, getAPMonth } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {


  if (d3.selectAll('.proj-date').html().length < 2) {
    
    var headerDateText = "<div class='as-of-text'>See projection as of...</div>"
    // headerDateText += "<span class='control back-control'></span>";

    for (i in config.dateProjs) {
      var thisDate = config.dateProjs[i]
      headerDateText += "<span data-ind='"+ i +"' class='date-button " + classify("date" + thisDate + "%") + "'>";
      thisDate = new Date(thisDate)
      headerDateText += getAPMonth(thisDate) + " " + thisDate.getDate()
      headerDateText += "</span>"
    }

    // headerDateText += "<span class='control fwd-control'></span>";
    headerDateText += "<div class='animate on'><span class='on' alt-text='&#9658;&nbsp; Play'>| | &nbsp; Pause</span></div>";

    d3.select('.proj-date').html(headerDateText)    


 


  }


  d3.selectAll('.proj-date span').classed("active-date", false)
  d3.select("." + classify("date"+config.thisProjDate)).classed("active-date", true)



  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;


  var margins = {
    top: 5,
    right: 10,
    bottom: 20,
    left: 50
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 10;
  }

  if (config.modelName != "all") {
    ticksX = 3;
    ticksY = 3;
    margins.right = 0
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
  var max = 125000;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var keyCats = ['Model projection', 'Ensemble model projection', 'Actual deaths'];

  var colorScale = d3
    .scaleOrdinal()
    .domain(keyCats)
    .range([
      COLORS.orange3,
      COLORS.teal3,
      "#ccc",
      COLORS.orange3,
      COLORS.teal3
    ]);



  if (config.modelName == 'all') {
  // Render the HTML legend.
    var legend = containerElement
      .append("ul")
      .attr("class", "key")
      .selectAll("g")
      .data(keyCats)
      .enter()
      .append("li")
      .attr("class", d => "key-item " + classify(d));

    legend.append("b").style("background-color", d => colorScale(d));

    legend.append("label").text(d => d);  
  }

  


  // Create the root SVG element.

  if (config.modelName != "all") {
    containerElement.append("div")
     .classed("model-title", true)
     .append("h3")
     .html(config.modelName)
     .attr("style", 'padding-left:' + margins.left + 'px; padding-right:' + margins.right + "px;")
  }

  

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper")
    .attr("id", "graphic-wrapper-" + classify(config.modelName));

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);



  // add months 

  var months = ['3', '4', '5', 6]

  for (i=0; i<months.length-1; i++) {

    var xPos = xScale(new Date(months[i] + "/1/2020"))
    var xWidth = xScale(new Date(months[i + 1] + "/1/2020")) - xScale(new Date(months[i] + "/1/2020"))


    chartElement.append("rect")
      .classed("month-shade", true)
      .classed('month-shade-dark', i%2 == 0 ? true : false)
      .attr("x", xPos)
      .attr("y", 0)
      .attr("width", xWidth)
      .attr("height", yScale(0))
  }


  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
        return (d.getMonth() + 1) + "/" + d.getDate();
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d=>d/1000 + " K") ;

  // Render axes to chart.

  if (config.modelName == 'all' || config.modelName == "Reich Ensemble") {

    chartElement
      .append("g")
      .attr("class", "x axis")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxis);

    chartElement
      .append("g")
      .attr("class", "y axis")
      .call(yAxis);

  }

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



  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name.split("%")[0]))
    .classed("projection", d => d.name.indexOf("%") > -1)
    .attr("d", d => line(d.values.filter(x=>x.amt != 0)));

  var lastItem = d => d.values[d.values.length - 1];




  if (config.modelName == "all") {

    for (i=0; i<months.length-1; i++) {

      var xPos = xScale(new Date(months[i] + "/1/2020"))
      var xWidth = xScale(new Date(months[i + 1] + "/1/2020")) - xScale(new Date(months[i] + "/1/2020"))


      chartElement.append('text')
        .attr("x", xPos + xWidth/2)
        .attr("y", yScale(118000))
        .text(getAPMonth(new Date(months[i] + "/1/2020")))
        .classed("month-name", true)
    }

  }

  d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  };

  d3.select(".covid-forecast-hub-ensemble").moveToFront();

  


  // text label

  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
  //   .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
  //   .text(function(d) {
  //     var deathsExistValues = d.values.filter(x => x.amt != "")
  //     var item = deathsExistValues[deathsExistValues.length - 1];
  //     var value = item[valueColumn];
  //     var label = value.toFixed(1);

  //     if (!isMobile.matches) {
  //       label = d.name.split("%")[0] + ": " + label;
  //     }

  //     if (label.indexOf("deaths") > -1) { return }

  //     return label;
  //   });


 



};
