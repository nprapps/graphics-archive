var wrapWidth;
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;
var columnExclude = [
  "metro",
  "index",
  "geoid",
  "highlight",
  // "overall",
  "total_pop",
  "aian_pop",
  "api_pop",
  "black_pop",
  "Hispanic_pop",
  "white_pop",
  "other_pop",
  "twomore_pop"
]

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();

//Initialize graphic
var onWindowLoaded = function() {
  formatData();
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

//Format graphic data for processing by D3.
var formatData = function() {  

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {
    if (columnExclude.includes(column)) continue;

    // var options = ["white","black","Hispanic"]

    dataSeries.push({
      name: column,
      values: DATA.map(d => ({
        overall: d["overall"],
        // amt: d[column],
        white: d["white"],
        black: d["black"],
        Hispanic: d["Hispanic"],
        item: d["metro"],
        index: d["index"],
        pop: d[`${column}_pop`],
        highlight: d["highlight"]
      }))
    });
  }
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = "#scatter-plot";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderScatterPlot({
    container,
    width,
    data: dataSeries
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderScatterPlot = function(config) {
  // Setup
  var overallColumn = "overall";
  // var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 5 : 9;

  var margins = {
    top: 5,
    right: 20,
    bottom: 45,
    left: 50
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 5;
  wrapWidth = 150;
  var wrapHeight = 20;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 15;
    wrapHeight=15;
    wrapWidth=100;
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

  var min = 0;
  var max = 100;

  var xScale = d3
    .scaleLinear()
    .domain([min,max])
    .range([0, chartWidth]);

  var popMinMax = [1400,1771956]

  var popScale = d3.scaleLinear()
    .domain(popMinMax)
    .range([3,30])
  // var values = config.data.reduce(
  //   (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
  //   []
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
      "#ccc",
      COLORS.yellow3,
      // "#ccc",
      COLORS.red3,      
      // "#ccc",
      COLORS.blue3,
    ]);

  // Render the HTML legend.

  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d.name));

  legend.append("b").style("background-color", d => colorScale(d.name));

  legend.append("label").text(function(d) {
    var adjustment = "";
    if (d.name === "white") {
      adjustment = " (non-Hispanic)"
    }
    return `${d.name.charAt(0).toUpperCase()}${d.name.slice(1)}${adjustment}`;
  })

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
      return d;
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

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

  chartElement.append('text')
      .attr('class', 'x axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 40)
      .text(xAXIS);

  chartElement.append('text')
      .attr('class', 'y axis-label')
      .attr('text-anchor', 'middle')
      .attr('y', -margins['left'])
      .attr('dy', '1em')
      .attr('x', -(chartHeight / 2))
      .attr('transform', 'rotate(-90)')
      .text(yAXIS);

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

  // Render 45deg average line.
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(100));

    var noteWidth = 200;
    var noteTop = 80;

    if (isMobile.matches) {
      noteWidth = 120;
      noteTop = 95;
    }

    chartElement
      .append("text")            
      .attr('class', 'note')      
      .attr('text-anchor', 'left')
      .attr('x', xScale(5))
      .attr('y', yScale(noteTop))
      .text(NOTE)
      .call(wrapText, noteWidth, 14);

    // chartElement
    //   .append("line")
    //   .attr("class", "pointer-line")
    //   .attr("x1", xScale(8))
    //   .attr("x2", xScale(8))
    //   .attr("y1", yScale(noteTop) + 30)
    //   .attr("y2", yScale(10));


  // container for the connector line between items
  chartElement.append("g").attr("class","connector")

  // Render dots
  var dots = chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data(config.data)
    .enter()
      .append("g")
      .attr('class',d => classify(d.name));

  dots.selectAll("circle")
    .data(function(d, i) {
      d.values.forEach(function(v,k) {
        v.series = d.name;
      });
      return d.values;
    })
    .enter()
      .append("circle")
      .attr("class",function(d){
        var below = "";
        if (d[d.series] < 51) {
          below = "below";
        }
        return `dot ${d.series} id${d.index} ${below}`
      })
      .attr("cx", d => xScale(d[overallColumn]))
      .attr("cy", function(d){
        return yScale(d[d.series])
      })
      .attr("fill", d => colorScale(d.series))
      .attr("stroke-width",function(d){
        var width = 0.5;
        

        return width;
      })
      .attr("stroke","#fff")
      .attr("fill-opacity",0.8)
      .attr("r", function(d){        
        if (isMobile.matches) {
          return 4
        }
        else {
          // return popScale(d.pop)
          return 6
        }
      })


  // search for and highlight albany to start off
  var albany = config.data[0].values.filter(d => d.highlight).pop();
  highlightCity(albany,chartElement,yScale,xScale);  

  if (!isMobile.matches) {
    dots.selectAll(".dot").on("mouseover",function(d){
      deSelectCity();
      highlightCity(d,chartElement,yScale,xScale)
    })

    dots.selectAll(".dot").on("mouseout",function(d){
      deSelectCity();
    })
  }


};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

function deSelectCity() {
  // d3.selectAll(".dot").classed("starter",false);
  d3.selectAll(".dot").classed("active",false);
  d3.selectAll(".dot").classed("semi-active",true);
  d3.selectAll(".tooltip").remove();
  d3.selectAll(".tooltip-line").remove();
  d3.selectAll(".tooltip-label").remove();
  d3.selectAll(".connector-line").remove();
  
}

function highlightCity(data,chartElement,yScale,xScale) {
  var name = data.item;
  var code = data.index;  

  // turn off everything
  d3.selectAll(".dot").classed("active",false)
  d3.selectAll(".dot").classed("semi-active",false)

  // turn on dot colors
  d3.selectAll(".dot.id"+ code)
    .classed("active",true)
    .moveToFront();

  // if (starter) {
  //   // turn off everything
  //   d3.selectAll(".dot")
  //     .classed("starter",true)    
  // }
  
  // create json of three data points
  var points = [data.white, data.black, data.Hispanic];
  // create array of offsets, defaulted to 0
  var offsets = getOffsets(points)

  var xPadding = 20;

  // draw three data points text and lines and label

  chartElement
    .selectAll(".tooltip")
    .data(points)
    .enter()
    .append('text')
      .attr('class', 'tooltip')      
      .attr('text-anchor', 'left')
      .attr('x', xScale(data.overall) + xPadding)
      .attr('y', function(d,i){      
        return yScale(d) + offsets[i] + 5;
      })
      .text(d => d);

  chartElement
    .selectAll(".tooltip-line")
    .data(points)
    .enter()
    .append('line')
      .attr('class', 'tooltip-line')      
      .attr('x1', xScale(data.overall) + xPadding - 5)
      .attr('y1', function(d,i){
        return yScale(d) + offsets[i];
      })
      .attr('x2', xScale(data.overall))
      .attr('y2', d => yScale(d) )

  // overall labels for tooltip
  chartElement
    .append('line')
      .attr('class', 'tooltip-line')      
      .attr('x1', xScale(data.overall) - xPadding + 5)
      .attr('y1', yScale(data.overall))
      .attr('x2', xScale(data.overall))
      .attr('y2', yScale(data.overall))

  chartElement
    .append('text')
      .attr('class', 'tooltip overall')      
      .attr('text-anchor', 'right')
      .attr('x', xScale(data.overall) - xPadding - 15)
      .attr('y', yScale(data.overall) + 5)
      .text(data.overall);

// console.log(Math.round((data.item.length*10) / wrapWidth)*10)

  var maxItem = Math.max(data.white,data.overall);
  var minItem = Math.min(data.black,data.Hispanic);

  chartElement    
    .append('text')
      .attr('class', 'tooltip-label')      
      .attr('text-anchor', 'middle')
      .attr('x', xScale(data.overall))
      .attr('y', yScale(maxItem) - 15 - Math.round((data.item.length*10) / wrapWidth)*10)
      .text(data.item.replace(/\-/g,", "))
      .call(wrapText, wrapWidth, 14);

  // add connector line
  chartElement.select("g.connector")
    .append('line')
      .attr('class', 'connector-line')      
      .attr('x1', xScale(data.overall))
      .attr('y1', yScale(maxItem))
      .attr('x2', xScale(data.overall))
      .attr('y2', yScale(minItem))      
}

function getOffsets(p) {
  function signer(p,o,i,j) {
    var sign = (Math.sign(p[i]-p[j]));  
    
    // if two numbers are equal, give a sign of 1. 
    if (sign === 0) {    
      var sign = 1; 
    }
    
    o[i]=sign*gap*-1;
    o[j]=sign*gap;
    return o;
  }

  var o = [0,0,0];
  var gap = 10;
  var threshold = 4;
  // if three data p too similar, adjust heights
  if (Math.abs(p[0]-p[1]) < threshold) {
    o = signer(p,o,0,1);
  }

  if (Math.abs(p[0]-p[2]) < threshold) {
    o = signer(p,o,0,2);
  }

  if (Math.abs(p[1]-p[2]) < threshold) {
    o = signer(p,o,1,2);
  }

  return o;
}

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};