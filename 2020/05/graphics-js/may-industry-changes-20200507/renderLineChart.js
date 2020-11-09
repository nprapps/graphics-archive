console.clear();


var state = {};
state['allowHover'] = true;


var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText, fmtComma} = require("./lib/helpers");
var { yearFull, yearAbbrev, getAPMonth } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  state[config.title] = {'allowHover': true}
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 125,
    bottom: 20,
    left: 35
  };

  var ticksX = 4;
  var ticksY = 5;
  var roundTicksFactor = 5;

  // Mobile

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
  var max = Math.max.apply(null, ceilings);

  if (config.title != "medical") {
    max = 5
    min = -60
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

 
  // Render the HTML legend.

  var industryTypes = [];

  for (i in config.data) {
    var type2 = INDUSTRYDATA.filter(x=>x.name == [config.data[i].name])[0].type2;
    if (industryTypes.indexOf(type2) == -1) {
      industryTypes.push(type2)
    }
  }


  if (config.showKey) {
    //   var legend = containerElement
    //   .append("ul")
    //   .attr("class", "key")
    //   .selectAll("g")
    //   .data(industryTypes)
    //   .enter()
    //   .append("li")
    //   .attr("class", d => "key-item " + classify(d));

    // // legend.append("b");

    // legend.append("label").text(d => d);


    var legend = containerElement
      .append("select")
      .attr("class", "select-key")
      .selectAll("option")
      .data(config.data.map(d=>d.name))
      .enter()
      .append("option")
      .attr("class", d => "key-item " + classify(d))
      .attr("value", d => d)
      .text(function(d,i) {
        var extraHyphensCt = 0;
        var subLevel = INDUSTRYDATA.filter(x=>x.name == d)[0].sublevel;
        if (subLevel > 0) {
          extraHyphensCt = subLevel
        }
        var extraHyphens = "-".repeat(extraHyphensCt)
        return i ==0 ? d : extraHyphens + "-" + d
      });

    // legend.append("b");

    // legend.append("label").text(d => d);
  }



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
      return getAPMonth(d);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d=>d + "%");

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
    .attr("class", d => "line " + classify(d.name) + " " + classify(INDUSTRYDATA.filter(x=>x.name == [d.name])[0].type))
    // .attr("stroke", d => colorScale(config.INDUSTRYDATA[d.name]))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .attr("dy", d => lastItem(d)[valueColumn] < -5 ? -14 : 14)
    .attr("class", d => "endlabel " + classify(d.name))
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(1) + "%";

      // label = d.name + ": " + label + "%";

      var jobsLost;
      var jobsLostCheck = false;


      var jobDiff = config.JANAPRRAW[d.name]



      if (jobDiff < 0) {
        jobsLostCheck = true;
      }

      if (Math.abs(jobDiff) < 1000) {
        jobsLost = fmtComma(Math.abs(jobDiff).toFixed(0)) + "K";
      }
      else {
        jobsLost = fmtComma(Math.abs(jobDiff/1000).toFixed(1)) + "M";
      }

      var jobsLostText = jobsLostCheck ? jobsLost + " jobs lost since Jan." : fmtComma(jobsLost) + " jobs gained since January"

      return jobsLostText + " (" + label + ")";
    })
    .call(wrapText, 120, 14)
    .classed("hidden", true)



    // show default

    var showDefault; 

    if (config.title == 'medical') {
      showDefault = function() {
        d3.selectAll("." + classify('hospitals')).classed("active", true)
      }  
    }
    else {
      showDefault = function() {
        d3.selectAll("." + classify(config.title)).classed("active", true)
      } 
    }

    

    showDefault();





    // allow interactivity

    var clearActive = function(thisTitle){
      d3.selectAll("#line-chart-" + classify(thisTitle) + " .lines path").classed("active", false)
      d3.selectAll("#line-chart-" + classify(thisTitle) + " .endlabel").classed("active", false)
    }


    var thisTitle = config.title

    if (thisTitle == 'medical') {
       d3.selectAll("#line-chart-"+classify(thisTitle)+" .lines path").on("mouseover", function(){
        // if (!state.allowHover) {
        //   return;
        // }
        clearActive(thisTitle);
        d3.select(this).classed("active", true)
        var industryNameClass = d3.select(this).attr('class').split(" ")[1];
        d3.select(".endlabel." + industryNameClass).classed("active", true)
        // d3.select("text." + this)
      }) 
    }

      

    if (config.title == 'medical') {
      d3.select("select").on("change", function() {
        var thisIndustry = d3.select(this).property('value');

        d3.selectAll(".lines path").classed("active", false)
        d3.selectAll(".endlabel").classed("active", false)

        d3.selectAll('.' + classify(thisIndustry)).classed('active', true)
      })
    }
    


    d3.select("#line-chart-" + classify(thisTitle) + " select").on("change", function() {

      var thisIndustry = d3.select(this).property('value');


      if (thisIndustry == 'allow-hover') {
        clearActive(thisTitle);
        state.allowHover = true;
        showDefault();
        return;
      }


      clearActive(thisTitle);

      d3.selectAll('.' + classify(thisIndustry)).classed('active', true)
      state.allowHover = false;

    })


};




