
var wrapWidth;
var highlight = 0;
var typeHighlight = 0;
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
// autocomplete input element
require("./autocomplete");
var $ = require("./lib/qsa");

var { isMobile } = require("./lib/breakpoints");
var {
xAXIS, 
yNewDeaths,
yVaccineRate,
vaxYint,
vax100X,
deathYint,
death100X,
vaxlower,
vaxupper,
deathlower,
deathupper,
deathoverall,
vaxoverall,
NOTE,
vaxlowerLabel,
vaxupperLabel,
deathlowerLabel,
deathupperLabel
} = LABELS;

var dataSeries = [];
var pymChild;
var columnExclude = [
  "NAME",
  "highlight",
  "FIPS",
  "P1_001N",
  "trump_votes",
  "totalVotes",
  "5/19/21",
  "11/16/21",
  "Series_Complete_12Plus",
  "Series_Complete_12PlusPop_Pct",
  "Series_Complete_18Plus",
  // "Series_Complete_18PlusPop_Pct",
  "Series_Complete_65Plus",
  "Series_Complete_65PlusPop_Pct",
  // "Series_Complete_Pop_Pct",
  "pctVoteTrump",
  "newDeaths",
  // "newDeathsPer100k",
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

    dataSeries.push({
      name: column,
      values: DATA.map(d => ({
        item: d["NAME"],
        index: d["FIPS"],
        pop: d["P1_001N"],
        newDeathsPer100k: d["newDeathsPer100k"],
        pctVoteTrump: d["pctVoteTrump"],
        Series_Complete_18PlusPop_Pct: d["Series_Complete_18PlusPop_Pct"]
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
  var overallColumn = "newDeathsPer100k";
  var xColumn = "pctVoteTrump";

  renderScatterPlot({
    container,
    width,
    data: dataSeries.filter(d => d.name == overallColumn),
    overallColumn,
    xColumn,
    yMin: 0,
    yMax: 250,
    yLabel: yNewDeaths,
    trendLine: [
      [0,deathYint],
      [100,death100X]
    ],
    averages: {
      lower: JSON.parse(deathlower),
      upper: JSON.parse(deathupper),
      overall: JSON.parse(deathoverall)
    },
    OtherLabels: {
      lower: deathlowerLabel,
      upper: deathupperLabel
    }
  });

  var container = "#scatter-plot2";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  var overallColumn = "Series_Complete_18PlusPop_Pct";
  var xColumn = "pctVoteTrump";

  renderScatterPlot({
    container,
    width,
    data: dataSeries.filter(d => d.name == overallColumn),
    overallColumn,
    xColumn,
    yMin: 0,
    yMax: 100,
    yLabel: yVaccineRate,
    trendLine: [
      [0,vaxYint],
      [100,vax100X]
    ],
    averages: {
      lower: JSON.parse(vaxlower),
      upper: JSON.parse(vaxupper),
      overall: JSON.parse(vaxoverall)
    },
    OtherLabels: {
      lower: vaxlowerLabel,
      upper: vaxupperLabel
    }
  });

  var countyMenu = d3.select('#counties');
    
  // create list
  // sort... not working??
  
  var counties = dataSeries[4].values.sort((a,b)=> a.item - b.item);

  countyMenu
    .selectAll('option')
    .data(counties)
    .enter()
    .append('option')
    .attr('class',d => `county-option ${classify(d.item)}`)
    .text(d => d.item)
    .attr("data2",d => d.index)
    .attr('value', d => d.item);


  var searchBox = $.one("#search");

  searchBox.addEventListener("change", function (e) {
    var value = searchBox.value;

  // d3.select(".counties#search").on('change', function() {
    // console.log("here")
    var inputVal = document.getElementById('search').value;
    // console.log(value)
    var fips = d3.select(`.county-option.${classify(inputVal)}`).data()[0].index;

    d3.selectAll(".dot").classed("active",false)

    let data = d3.select(`.county-option.${classify(inputVal)}`).data()[0];

    // edit the table

    d3.select("#lookup").classed("active",true);

    let voteTrump = d3.select("#voteTrump");
    let vaxRate = d3.select("#vaxRate");
    let vaxStat = d3.select("#vaxStat");
    let deathRate = d3.select("#deathRate");
    let deathStat = d3.select("#deathStat");
    let overallVax = JSON.parse(vaxoverall)[1];
    let overallDeath = JSON.parse(deathoverall)[1];
    
    voteTrump.html(`${Math.round(data.pctVoteTrump*100,1)}%`).style("background-color",() => {
      if (data.pctVoteTrump > 0.6) {
        typeHighlight = "bigTrump";
        return COLORS.red3;
      } else if (data.pctVoteTrump > 0.4) {
        typeHighlight = "middle";
        // return  COLORS.blue5;
        return "#999"
      } else {
        typeHighlight = "bigBiden";
        return COLORS.blue2;
      }
    })
    vaxRate.html(`${Math.round(data.Series_Complete_18PlusPop_Pct,0)}% of 18+ population vaccinated.`)

    vaxStat.html(function(){
      if (data.Series_Complete_18PlusPop_Pct > overallVax) {
        var amt = Math.round(data.Series_Complete_18PlusPop_Pct - overallVax,1);
        return `▲ ${amt} pts higher than the overall average`;
      } else {
        var amt = Math.round(overallVax - data.Series_Complete_18PlusPop_Pct,1);
        return `▼ ${amt} pts lower than the overall average`;
      }
    })
    deathRate.html(`${Math.round(data.newDeathsPer100k,0)} deaths per 100k since May 1.`)
    deathStat.html(function(){
      if (data.newDeathsPer100k > overallDeath) {
        var amt = Math.round(data.newDeathsPer100k - overallDeath,1);
        return `▲ ${amt} deaths per 100k higher than the overall average`;
      } else {
        var amt = Math.round(overallDeath - data.newDeathsPer100k,1);
        return `▼ ${amt} deaths per 100k lower than the overall average`;
      }
    })

    pymChild.sendHeight();

    // turn on dot colors
    d3.selectAll(".dot.id"+ fips)
      .classed("active",true)
      .classed(typeHighlight,true)
      .moveToFront();


    highlight = fips;


  })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderScatterPlot = function(config) {

  var { xColumn, overallColumn, yMin, yMax, yLabel } = config;

  // Setup
  var aspectWidth = isMobile.matches ? 10 : 10;
  var aspectHeight = isMobile.matches ? 8 : 8;

  var margins = {
    top: 10,
    right: 20,
    bottom: 45,
    left: 50
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 5;
  wrapWidth = 150;
  var wrapHeight = 20;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 15;
    // margins.top = 100;
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

  var popMinMax = [10,10000000]

  var popScale = d3
    .scaleLinear()
    .domain(popMinMax)
    .range((isMobile.matches) ? [2,30] : [2,30])

  var yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([chartHeight, 0]);

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
      .text(yLabel);

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
      return d.values.sort((a,b) => b.pop-a.pop);
    })
    .enter()
      .append("circle")
      .attr("class",function(d){
        return `dot ${d.series} id${d.index}`
      })
      .attr("cx", d => xScale(d[xColumn]*100))
      .attr("cy", function(d){
        return yScale(d[d.series])
      })
      .attr("fill", "#777")
      .attr("r", function(d){        
          return popScale(d.pop)
      })

  if (highlight != 0) {
    d3.selectAll(".dot.id"+ highlight)
    .classed("active",true)
    .classed(typeHighlight,true)
    .moveToFront();  
  }
  


  /*
   *  bars
   */
  var lowerPct = 0.4;
  var upperPct = 0.6;
  var groups = [
      { 'begin':0,'end':lowerPct*100  },
      { 'begin':upperPct*100,'end':100 }
  ];

  var lower = config.averages.lower;
  var upper = config.averages.upper;
  var overall = config.averages.overall;
  var lineLength = 10;

  // Averages lower
  chartElement
    .append("text")
    .attr("class", "average-line backdrop")
    .attr('x', xScale(lower[0]))
    .attr('y', yScale(lower[1]))
    .attr("text-anchor","middle")
    .attr("alignment-baseline","middle")
    .text("+");

  chartElement
    .append("text")
    .attr("class", "average-line lower")
    .attr('x', xScale(lower[0]))
    .attr('y', yScale(lower[1]))
    .attr("text-anchor","middle")
    .attr("alignment-baseline","middle")
    .text("+");

  chartElement
    .append("text")
    .attr("class", "average-line backdrop")
    .attr('x', xScale(upper[0]))
    .attr('y', yScale(upper[1]))
    .attr("text-anchor","middle")
    .attr("alignment-baseline","middle")
    .text("+");

  chartElement
    .append("text")
    .attr("class", "average-line upper")
    .attr('x', xScale(upper[0]))
    .attr('y', yScale(upper[1]))
    .attr("text-anchor","middle")
    .attr("alignment-baseline","middle")
    .text("+");

  chartElement
    .append("text")
    .attr("class", "average-line backdrop")
    .attr('x', xScale(overall[0]))
    .attr('y', yScale(overall[1]))
    .attr("text-anchor","middle")
    .attr("alignment-baseline","middle")
    .text("+");

  chartElement
    .append("text")
    .attr("class", "average-line overall")
    .attr('x', xScale(overall[0]))
    .attr('y', yScale(overall[1]))
    .attr("text-anchor","middle")
    .attr("alignment-baseline","middle")
    .text("+");  
  
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};
