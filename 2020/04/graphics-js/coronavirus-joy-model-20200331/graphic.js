console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var ALLSTATES = require("./states.js");

var dataSeries = {};
var states = [];
var DATASHOW = []
var dateInclude = [];
var yourState = "";
var showAll = false;
var monthList = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "August", "Sept.", "Oct.", "Nov.", "Dec."];
var perPopulation = 100000;
var projDate = new Date("4/16/2020");

// fix later grimmace
var stats = {
  "Tennessee": {
    "MaxBeds":7812,
    "population":6829174
  },
  "Alabama": {
    "MaxBeds":5743,
    "population":4903185
  },
  "New York": {
    "MaxBeds":13010,
    "population": 19453561
  }

}


var pymChild;

var { fmtComma, COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();
var fmtAxisLabel = d => d >= 1000 ? `${d/1000}K` : d

//Initialize graphic
var onWindowLoaded = function() {
  var valueColumn = "deaths";

  if (TYPE == "bed") {
    valueColumn = "allbed";  
    perPopulation = stats[STATE].population;    
  }

  render(valueColumn, yourState, showAll);

  window.addEventListener("resize", function(){render(valueColumn, yourState, showAll)});

  pym.then(child => {
    pymChild = child;
    child.sendHeight();


  });
};





//Format graphic data for processing by D3.
var formatData = function(valueColumn, yourState) {
  dataSeries = {};
  DATASHOW = [];

  if (showAll) {
    STATE = [...ALLSTATES];
  }


  if (STATE.length != 1 && !showAll) {
    var statesToShow = ["New York", "California", "Massachusetts"];
  } 
  else {
    var statesToShow = STATE;
  }


  if (yourState != "" && !showAll) {
    statesToShow = [yourState]
  }

  STATE = statesToShow


  // only include dates that have non-zero data

  // transform data into floats if needed

  var ignoreCols = ['date', 'location_name']
  for (i in DATA) {
    for (var columnI in DATA[i]) {
      if (typeof DATA[i][columnI] == 'string' && ignoreCols.indexOf(columnI) == -1) {
        if (columnI == 'state_pop') {
          DATA[i][columnI] = parseInt(DATA[i][columnI]);
        } 
        else {
          DATA[i][columnI] = parseFloat(DATA[i][columnI]);
        }
      }
    }
  }




  if (dateInclude.length == 0) {
     for (i in DATA) {
        if (DATA[i][valueColumn + "_mean"] > 0 && dateInclude.indexOf(DATA[i].date) == -1) {
          dateInclude.push(DATA[i].date)
        } 
      }  
  }
 

  if (DATA.filter(x=>dateInclude.indexOf(x.date) > -1).length > 0) {
    DATA = DATA.filter(x=>dateInclude.indexOf(x.date) > -1)
  }

  // narrow to state if not all

    DATASHOW = [...DATA]




  // only run this if first time formatting data
  try {
      DATA.forEach(function(d) {
        if (d.date.indexOf("/") > -1) {
          var [m, day, y] = d.date.split("/").map(Number);
        }
        else if (d.date.indexOf("-") > -1) {
          var [y, m, day] = d.date.split("-").map(Number);
        }
        if ( y < 2000) {
          y = y > 50 ? 1900 + y : 2000 + y;
        }
        d.date = new Date(y, m - 1, day);
      });
  }
  catch(err) {}
  

  states = [...new Set(STATE.map(d => d))];



  for (i in ALLSTATES) {

    var thisState = ALLSTATES[i];


    dataSeries[thisState] = [];

    // Restructure tabular data for easier charting.
    for (var column in DATASHOW[0]) {
      if (ignoreCols.indexOf(column) > -1) continue;

      dataSeries[thisState].push({
        name: column,
        values: DATASHOW.filter(x=>x.location_name == thisState).map(d => ({
          date: d.date,
          amt: d[column],
          amtPerCap: (d[column] * perPopulation) / d["state_pop"] 
        }))
      });
    }
  }




};

// Render the graphic(s). Called by pym with the container width.

var render = function(valueColumn, yourState) {


  // format data on render

  formatData(valueColumn, yourState);

  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Create the root SVG element.
  var containerElement = d3.select(container);
  containerElement.html("");

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var margins = {
    top: 10,
    right: 5,
    bottom: 20,
    left: 30
  };

  if (TYPE == "bed") {
    margins.left += 40;
  }

  var chartHeight = 95 - margins.top - margins.bottom;


  var chartSvg = chartWrapper.append("svg")
    .attr("width", width)
    .attr("height", function(){
      var moreHeight = 50;
      if (!showAll) {
        if (STATE.indexOf("New York") > -1) moreHeight = 90; 
        else if (STATE.indexOf("Massachusetts") > -1) moreHeight = 120; 
        else if (STATE.indexOf("Connecticut") > -1) moreHeight = 210; 
        else if (STATE.indexOf("New Jersey") > -1) moreHeight = 190; 
        else if (STATE.indexOf("Rhode Island") > -1) moreHeight = 270; 
      }
      if(TYPE == "bed") {
        moreHeight = 10;
      }

      margins.top += moreHeight;
      var lessSvgHeight = -25;
      return lessSvgHeight + moreHeight  + (chartHeight * (states.length + 1))
    })


  // order states

  var stateMaxes = {}





  for (i in ALLSTATES) {
    if (DATEOVERRIDE[ALLSTATES[i]] != undefined ) {
      var maxDateObj = new Date(DATEOVERRIDE[ALLSTATES[i]])
      var stateVals = dataSeries[ALLSTATES[i]].filter(x=>x.name == valueColumn + "_mean")[0].values
      stateMaxes[ALLSTATES[i]] = {"date": maxDateObj, 
                                  'amt': stateVals.filter(x=>x.date.getMonth() + "-" + x.date.getDate() == maxDateObj.getMonth() + "-" + maxDateObj.getDate())[0].amt}
      continue;
    }
    var max = 0
    for (k in dataSeries[ALLSTATES[i]]) {
      if (dataSeries[ALLSTATES[i]][k].name == valueColumn + "_mean") {
        for (v in dataSeries[ALLSTATES[i]][k].values) {
          if (dataSeries[ALLSTATES[i]][k].values[v].amt > max ) {
            max = dataSeries[ALLSTATES[i]][k].values[v].amt;
            stateMaxes[ALLSTATES[i]] = {'date': dataSeries[ALLSTATES[i]][k].values[v].date, 
                                     'amt': max};
          }
        }
      }
    }
  }




  var stateSort = function(a,b) {
    if (stateMaxes[a].date > stateMaxes[b].date) return 1
    if (stateMaxes[a].date < stateMaxes[b].date) return -1
    return 0;
  }


  var alphaSort = function(a,b) {
    if (a > b) return 1
    if (a < b) return -1
  }


  states = states.sort(stateSort)


  var counter = 0;
  for (ind in states) {
    var stateName = states[ind]
    var ignoreStates = ["US", "Other Counties, WA", 'Life Care Center, Kirkland, WA', "King and Snohomish Counties (excluding Life Care Center), WA"]
    if (ignoreStates.indexOf(stateName) > -1) continue;
    renderLineChart({
      valueColumn,
      container,
      width,
      data: dataSeries[stateName],
      dataSeries,
      location_name: stateName,
      chartWrapper,
      chartWidth: width - margins.left - margins.right,
      chartHeight,
      chartSvg,
      chartIndex: counter,
      margins,
      stateName,
      stateMaxes,
      yourState
    });
    counter += 1;
  }

  





  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {


  // Setup

  var chartElement = config.chartSvg.append("g").attr('class', 'state-group ' + classify(config.stateName) + '-group')

  var dateColumn = "date";
  var valueColumn = config.valueColumn;

  var aspectWidth = isMobile.matches ? 16 : 16;
  var aspectHeight = isMobile.matches ? 1 : 1;



  var ticksX = 5;
  var ticksY = 3;
  var roundTicksFactor = .5;

  // push down the chart element


  chartElement.attr("transform", "translate(" + config.margins.left  + "," + (config.margins.top + config.chartIndex * config.chartHeight)  + ")")



  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, config.chartWidth]);



  max = 3
  var min  = 0

  if (TYPE == "bed") {
    if (STATE == "New York") {
      max = 50000;
    } else {
      max = 50000;
    }    
  }


  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([config.chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);


  // Create D3 axes.



  // put in a highilght if you chose a state

  if (config.yourState != "" && config.stateName == config.yourState) {
    // chartElement.append("rect")
    //   .attr("x", -1 * config.margins.left)
    //   .attr("y", 0)
    //   .attr("width", config.width + config.margins.left)
    //   .attr("height", config.chartHeight)
    //   .attr("class", "highlight-bkgrd")
  }

  // var showAxisStates = ['Vermont']
  var showAxisStates = false;


  if (config.chartIndex == 0) {
    showAxisStates = true;
  }




  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      if (showAxisStates ) {
        return monthList[d.getMonth()];
      }
    });



  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d=> !showAxisStates ? "" : fmtAxisLabel(d));

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, config.chartHeight))
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
    .attr("transform", makeTranslate(0, config.chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-config.chartHeight, 0, 0)
        .tickFormat("")
    );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-config.chartWidth, 0, 0)
        .tickFormat("")
    );

  // remove max grid line

  if (!showAxisStates) {
    chartElement.selectAll(".y.grid").select(".tick:last-of-type").attr("class", "hidden")
  }

  // Render 0 value line.

  // if (min < 0) {
  chartElement
    .append("line")
    .attr("class", "zero-line")
    .attr("x1", 0)
    .attr("x2", config.chartWidth)
    .attr("y1", yScale(0))
    .attr("y2", yScale(0));
  // }


  if (STATE.length == 1 && STATE[0] != yourState) {
      for (i in ALLSTATES) {

      // Render confidence interval (all in gray)
        // var confidence = [].concat(
        //   DATASHOW.filter(x=>x.location_name == ALLSTATES[i]).map(d => ({ date: d.date, value: (d[valueColumn + '_lower'] * perPopulation) / d['state_pop'] })),
        //   DATASHOW.filter(x=>x.location_name == ALLSTATES[i]).map(d => ({ date: d.date, value: (d[valueColumn + '_upper'] * perPopulation) / d['state_pop'] })).reverse()
        // );
        // var cLine = d3.line().x(function(d){ return xScale(d[dateColumn])}).y(d => yScale(parseFloat(d.value)));


        // chartElement
        //   .append("g")
        //   .append("path")
        //   .attr("class", "confidence " + classify(ALLSTATES[i]))
        //   .attr("d", cLine(confidence))
        //   .classed('active-state', ALLSTATES[i] == config.stateName);



        // Render lines to chart.
      var line = d3
        .line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.amtPerCap));



      chartElement
          .append("g")
          .attr("class", "lines")
          .selectAll("path")
          .data(config.dataSeries[ALLSTATES[i]].filter(x=>x.name == valueColumn + "_mean"))
          .enter()
          .append("path")
          .attr("class", d => "other-line line " + classify(d.name))
          .attr("stroke", d => colorScale(d.name))
          .attr("d", function(d) {   
            return line(d.values)
          });


      }  
  }


   // Render confidence interval one time


  var CONFIDENCEDATA = [...DATASHOW.filter(x=>x.date >= projDate)]


  var confidence = [].concat(
    CONFIDENCEDATA.filter(x=>x.location_name == config.stateName).map(d => ({ date: d.date, value: (d[valueColumn + '_lower'] * perPopulation) / d['state_pop'] })),
    CONFIDENCEDATA.filter(x=>x.location_name == config.stateName).map(d => ({ date: d.date, value: (d[valueColumn + '_upper'] * perPopulation) / d['state_pop'] })).reverse()
  );
  var cLine = d3.line().x(function(d){ return xScale(d[dateColumn])}).y(d => yScale(parseFloat(d.value)));


  chartElement
    .append("g")
    .append("path")
    .attr("class", "confidence active-state")
    .attr("d", cLine(confidence))

if (TYPE == "bed") {
    chartElement
    .append("line")
    .attr("class", "MaxBeds")
    .attr("x1", 0)
    .attr("x2", config.chartWidth)
    .attr("y1", yScale(stats[STATE].MaxBeds))
    .attr("y2", yScale(stats[STATE].MaxBeds));

    chartElement
    .append("text")
    .attr("class", "MaxBedsText")
    .attr('x', config.chartWidth - 5)
    .attr("y", yScale(stats[STATE].MaxBeds)-5)
    .text(`${fmtComma(stats[STATE].MaxBeds)} beds available`)
  }

      // Render lines to chart.
    var line = d3
      .line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.amtPerCap));

    chartElement
      .append("g")
      .attr("class", "lines")
      .selectAll("path")
      .data(config.data.filter(x=>x.name == valueColumn + "_mean"))
      .enter()
      .append("path")
      .attr("class", d => "line " + classify(d.name))
      .attr("stroke", d => colorScale(d.name))
      .attr("d", function(d) {        
        return line(d.values.filter(x=>x.date <= projDate))
      });

    chartElement
      .append("g")
      .attr("class", "lines proj")
      .selectAll("path")
      .data(config.data.filter(x=>x.name == valueColumn + "_mean"))
      .enter()
      .append("path")
      .attr("class", d => "line " + classify(d.name))
      .attr("stroke", d => colorScale(d.name))
      .attr("d", function(d) {
        if (TYPE == "bed") {
          return line(d.values)
        } else {
          return line(d.values.filter(x=>x.date >= projDate))  
        }
        
      });      




    // add in annotation layer

  
  var peakDate = config.stateMaxes[config.stateName].date
  var peakDateFmt = monthList[(peakDate.getMonth())] + " " + peakDate.getDate()
  var peakAmt = (perPopulation * config.stateMaxes[config.stateName].amt) / config.data.filter(x=>x.name == 'state_pop')[0].values[0].amt 
  var peakAmtRaw = config.stateMaxes[config.stateName].amt 


   chartElement
    .append('line')
    .attr('class', 'peak-line')
    .attr('x1', xScale(peakDate))
    .attr('x2', xScale(peakDate))
    .attr('y1', yScale(0))
    .attr('y2', yScale(peakAmt))



  var lineHeight = 13;
  var labelXmargin = TYPE == "bed" ? 40 : 30;

  if (STATE.length != 1) {

    chartElement.append("text")
      .attr('class', 'state-name')
      .attr('x', 2)
      .attr("y", yScale(.5) )
      // .attr("dy", config.chartHeight*2 - 10)
      // .attr("dx", config.chartHeight*2 - 10)
      .text(config.stateName == "District of Columbia" ? "D.C." : config.stateName )  
      // .call(wrapText, 100, 12)
  }
  
  // if (TYPE == "bed") {
  //   config.chartSvg.append("text")
  //     .attr('class', 'state-subtext subtext-label')
  //     .attr('x', config.margins.left - labelXmargin)
  //     .attr("y", config.chartIndex * config.chartHeight + lineHeight*0)
  //     .attr("dy",  8 + (config.margins.top - 25 + config.chartHeight/2))
  //     .text(TYPE == "bed" ? "Peak beds needed:" : "Peak deaths per 100k:")  
  //     // .call(wrapText, 110, lineHeight)

  //   config.chartSvg.append("text")
  //     .attr('class', 'state-subtext subtext-val')
  //     .attr('x', config.margins.left - labelXmargin)
  //     .attr("y", config.chartIndex * config.chartHeight + lineHeight*1)
  //     .attr("dy", 8 + (config.margins.top - 25 + config.chartHeight/2))
  //     .text(TYPE == "bed" ? fmtComma(Math.floor(peakAmt)) + " on " + peakDateFmt : peakAmt.toFixed(1) + " on " + peakDateFmt)  
  //     // .call(wrapText, 110, lineHeight)
  // }




  // config.chartSvg.append("text")
  //   .attr('class', 'state-subtext subtext-label')
  //   .attr('x', config.margins.left - labelXmargin)
  //   .attr("y", config.chartIndex * config.chartHeight + lineHeight*0)
  //   .attr("dy",  8 + (config.margins.top - 25 + config.chartHeight/2))
  //   .text(TYPE == "bed" ? "Peak beds needed:" : "Peak deaths per 100k:")  
  //   // .call(wrapText, 110, lineHeight)

  // config.chartSvg.append("text")
  //   .attr('class', 'state-subtext subtext-val')
  //   .attr('x', config.margins.left - labelXmargin)
  //   .attr("y", config.chartIndex * config.chartHeight + lineHeight*1)
  //   .attr("dy", 8 + (config.margins.top - 25 + config.chartHeight/2))
  //   .text(TYPE == "bed" ? fmtComma(Math.floor(peakAmt)) + " on " + peakDateFmt : peakAmt.toFixed(1) + " on " + peakDateFmt)  
  //   // .call(wrapText, 110, lineHeight)

  if (TYPE != "bed") {
     chartElement.append("text")
    .attr('class', 'state-subtext subtext-label anchor-end')
    .attr('x', config.chartWidth - 3)
    .attr("y", yScale(.9))
    // .attr("dy",  8 + (config.margins.top - 25 + config.chartHeight/2))
    .text("Total projected deaths:")  
    // .call(wrapText, 110, lineHeight)

  chartElement.append("text")
    .attr('class', 'state-subtext subtext-val anchor-end ')
    .attr('x', config.chartWidth - 3)
    .attr("y", yScale(.9))
    .attr("dy", lineHeight)
    .text(fmtComma(AGGDATA.filter(x=>x.name == config.stateName)[0].total_deaths))  
    // .call(wrapText, 110, lineHeight)

  }

 









  // add in peak annotation


  if (TYPE != 'bed' ) {
       chartElement
      .append("circle")
      .attr("cx", d => xScale(peakDate))
      .attr("cy", d => yScale(peakAmt))
      .attr("r", 3)
      .attr("class", "peak-circle")

    var scootUpText = 6;
    var scootRightText = 5;

    // if (STATE[0] == 'Alabama') {
    //   scootUpText = -13;
    //   scootRightText = -10;
    // }

    // if (STATE[0] == 'New York') {
    //   scootUpText = -10;
    //   scootRightText = -10;
    // }

    var anchorEnd = false;

    if (STATE.length == 1 && STATE[0] == "New York") {
      anchorEnd = true;
    }

    // bkgrd rect

    chartElement 
      .append("rect")
      .attr("class", 'bkgrd-rect')
      .attr("x", !anchorEnd ? xScale(peakDate) + scootRightText - 3 : xScale(peakDate) + scootRightText - 3 - 150)
      .attr("y", yScale(peakAmt) - lineHeight*3 - scootUpText - 14)
      .attr("width", 150)
      .attr("height", 48)



    chartElement
      .append("g")
      .attr("class", "value")
      .append("text")
      .attr("x", d => xScale(peakDate) + scootRightText)
      .attr("y", d => yScale(peakAmt) - lineHeight*3 - scootUpText)
      .text("Peak: "  +  peakDateFmt)
      .attr("class", "state-subtext")
      .classed("anchor-end", anchorEnd)

    chartElement
      .append("g")
      .attr("class", "value")
      .append("text")
      .attr("x", d => xScale(peakDate) + scootRightText)
      .attr("y", d => yScale(peakAmt) - lineHeight*2 - scootUpText)
      .text(fmtComma(peakAmtRaw.toFixed(0)) + " daily deaths")
      .attr("class", "state-subtext subtext-val")
      .classed("anchor-end", anchorEnd)


    chartElement
      .append("g")
      .attr("class", "value")
      .append("text")
      .attr("x", d => xScale(peakDate) + scootRightText)
      .attr("y", d => yScale(peakAmt) - lineHeight - scootUpText)
      .text(peakAmt.toFixed(1) + " daily deaths per 100K")
      .attr("class", "state-subtext subtext-val")
      .classed("anchor-end", anchorEnd)

    // chartElement
    //   .append("g")
    //   .attr("class", "value")
    //   .append("text")
    //   .attr("x", d => xScale(peakDate) + scootRightText)
    //   .attr("y", d => yScale(peakAmt) - scootUpText)
    //   .text(fmtComma(peakAmtRaw))
    //   .attr("class", "state-subtext subtext-val")
    //   .classed("anchor-end", anchorEnd)
  }




  if (TYPE == 'bed' && STATE.length == 1) {
       chartElement
      .append("circle")
      .attr("cx", d => xScale(peakDate))
      .attr("cy", d => yScale(peakAmt))
      .attr("r", 3)
      .attr("class", "peak-circle")

    var scootUpText = 0;
    var scootRightText = 0;

    if (STATE[0] == 'New York') {
      scootUpText = 3;
      scootRightText = 10;
    }

    // if (STATE[0] == 'Alabama') {
    //   scootUpText = 8;  
    //   scootRightText = 6;
    // }


    chartElement
      .append("g")
      .attr("class", "value")
      .append("text")
      .attr("x", d => xScale(peakDate) + scootRightText)
      .attr("y", d => yScale(peakAmt) - lineHeight*1 - scootUpText)
      .text("Peak beds needed:")
      .attr("class", "state-subtext")
      .classed("anchor-end", false)

    chartElement
      .append("g")
      .attr("class", "value")
      .append("text")
      .attr("x", d => xScale(peakDate) + scootRightText)
      .attr("y", d => yScale(peakAmt) - lineHeight*0 - scootUpText)
      .text(fmtComma(Math.floor(peakAmt)) + " on " + peakDateFmt)
      .attr("class", "state-subtext subtext-val")
      .classed("anchor-end", false)

  }


 

  // chartElement
  //   .append("g")
  //   .attr("class", "value range")
  //   .append("text")
  //   .attr("x", d => xScale(maxItem[dateColumn]))
  //   .attr("y", d => yScale(maxItem['upper']) + 19)
  //   .text("High: " + fmtComma(parseInt(maxItem.upper.toFixed(0))))

  // chartElement
  //   .append("g")
  //   .attr("class", "value range")
  //   .append("text")
  //   .attr("x", d => xScale(maxItem[dateColumn]))
  //   .attr("y", d => yScale(maxItem['lower']) - 12)
  //   .text("Low: " + fmtComma(parseInt(maxItem.lower.toFixed(0))))


  // chartElement
  //   .append("g")
  //   .attr("class", "value margin-annot")
  //   .append("text")
  //   .attr("x", d => xScale(maxItem[dateColumn]) - 15)
  //   .attr("y", yScale(3100))
  //   .text("estimate range")




















    // move first x axis
    if (showAxisStates) {
      chartElement.selectAll(".x.axis text")
        .attr("transform", function(){

          var newX = 20;
          var newY = parseFloat(config.chartHeight) * -1 - 25;

          return "translate(" + newX + "," + newY + ")";

        })
    }

 
  // add in estimate range label for just new york

  if (showAxisStates && TYPE  != "bed" && STATE.length < 2) {


    if (STATE[0] != "New York") {
     chartElement
      .append("g")
      .attr("class", "value margin-annot anchor-end")
      .append("text")
      .attr("x", config.chartWidth - 3)
      .attr("y", yScale(2.1))
      .text("estimate range in orange")      
    }
    else {
      chartElement
        .append("g")
        .attr("class", "value margin-annot ")
        .append("text")
        .attr("x", xScale(new Date("4/20/2020")))
        .attr("y", yScale(6))
        .text("estimate range in orange") 
    }

   

  }




  if (STATE.length == 1 && STATE[0]=='New York' && TYPE != "bed" && yourState != "New York") {

    var maxItem = DATASHOW[0];

    for (i in DATASHOW) {
      if (DATASHOW[i].deaths_mean > maxItem.deaths_mean) {
        maxItem = DATASHOW[i]
      }
    }





    chartElement
      .append("g")
      .attr("class", "value margin-annot gray")
      .append("text")
      .attr("x", xScale(new Date("5/14/2020")))
      .attr("y", yScale(2.3))
      .text("estimates for other states in gray")
      .call(wrapText,100,12)


    chartElement
    .append('text')
    .attr('class', 'peak-text')
    .attr('x', xScale(peakDate))
    .attr('y', yScale(-.7)-1)
    .text(function(){
      // var peakDate = new Date();
      return peakDateFmt
    })
   

  }

  // if (STATE.length == 1 && STATE[0] == yourState) {
  //   chartElement
  //     .append("g")
  //     .attr("class", "value margin-annot")
  //     .append("text")
  //     .attr("x", xScale(new Date("4/25/2020")))
  //     .attr("y", yScale(2))
  //     .text("estimate range shaded in orange")
  //     .call(wrapText,120,13)
  // }

  chartElement.append("rect")
    .attr("class",d => `coverup ${classify(config.stateName)}-group`)
    .attr("x",0)
    .attr("y",0)
    .attr("width",config.width)
    .attr("height",config.chartHeight)



  if (STATE.length > 1) {

    d3.selectAll(".coverup").classed("active", true)

    d3.selectAll(".confidence").classed("hidden", true)
    d3.selectAll(".value").classed("hidden", true)
    d3.selectAll(".peak-circle").classed("hidden", true)
    d3.selectAll(".bkgrd-rect").classed("hidden", true)

    d3.selectAll(".coverup").on("mouseover", function(){

      d3.selectAll(".peak-circle").classed("hidden", true)
      d3.selectAll(".confidence").classed("hidden", true)
      d3.selectAll(".value").classed("hidden", true)
      d3.selectAll(".bkgrd-rect").classed("hidden", true)


      d3.selectAll(".state-group").classed("inactive",true)
      d3.select(this.parentNode).classed("inactive",false)
      d3.select(this.parentNode).selectAll(".peak-circle").classed("hidden", false)
      d3.select(this.parentNode).selectAll(".value").classed("hidden", false)
      d3.select(this.parentNode).selectAll(".confidence").classed("hidden", false)
      d3.select(this.parentNode).selectAll(".bkgrd-rect").classed("hidden", false)
    
    })
    .on("mouseout", function() {
      d3.selectAll(".state-group").classed("inactive",false)
    })


  }




};

var toggleFunction = function(showAll, changemenu=false){
  if (showAll == true) {
      d3.select(".toggle-table").html("Show less ▲")
      // showAll = true;
      render('deaths', yourState, showAll);
      d3.select(".auto-text").classed("hidden", true)
    } 
  else {
    d3.select(".toggle-table").html("Show all (ordered by peak date) ▼")
    render('deaths', yourState, showAll);
    d3.select(".auto-text").classed("hidden", false)
    if (!changemenu) {
      pymChild.scrollParentToChildEl('dropdown');
    }
  }

  d3.select(".all-h4").classed("hidden", false)
  if (STATE.length == 1) {
    d3.select(".all-h4").classed("hidden", true)
  }

}


// Add toggle button that can collapse/expand the list.
var toggleButton = d3.select(".toggle-table");
  toggleButton.on('click', function() {
    showAll = !showAll;
    toggleFunction(showAll)

    // Update iframe
    if (pymChild) {
      pymChild.sendHeight();
    }

});


var stateMenu = d3.select('#dropdown');

stateMenu
  .selectAll("option.state-option")
  .data(ALLSTATES)
  .enter()
  .append("option")
  .attr("class", "state-option")
  .text(d => d)
  .attr("value", d => d);


stateMenu.on("change", function() {
  var section = document.getElementById("dropdown");
  userData = section.options[section.selectedIndex].value;

  yourState = userData;
  showAll = false;
  render("deaths", yourState, showAll);
  toggleFunction(showAll, true)


  // add the table


  // handle user data

  var renderAutoText = function(userDataMeasures) {
  
     d3.select(".auto-text").html('');
    
      if (stateName != "Select a State") {

        d3.select(".auto-text").append("div")
          .attr("class", "auto-table-hrr");
    
        d3.select(".auto-table-hrr").append("tr")
          .attr("class", "auto-table-hed")
          .html(`
            <td>State</td>
            <td>Peak date</td>
            <td class="amt">Projected bed shortages</td>
            <td class="amt">Projected deaths on peak date</td>
            <td class="amt">Projected cumulative deaths</td>
          `);
      
        for (i in userDataMeasures) {
          var stateName = userDataMeasures[i]

          if (DATEOVERRIDE[stateName.state] != undefined) {
            var overrideDateObj = new Date(DATEOVERRIDE[stateName.state]);
            stateName.date = monthList[overrideDateObj.getMonth()] +  " " + overrideDateObj.getDate();
            stateName.death_peak = DATA.filter(x=>x.location_name == stateName.state && stateName.date == monthList[x.date.getMonth()] +  " " + x.date.getDate())[0].deaths_mean.toFixed(0)
          }

          console.log(stateName)

          d3.select(".auto-table-hrr").append("tr")
            .html(`
              <td>${stateName.state}</td>
              <td>${stateName.date}</td>
              <td class="amt">${fmtComma(stateName.bed_range)}</td>
              <td class="amt">${fmtComma(stateName.peak_deaths_range)}</td>
              <td class="amt">${fmtComma(stateName.total_low_deaths)} - ${fmtComma(stateName.total_high_deaths)}</td>
            `);
         
          
        }

      }
        
  }

  var userDataMeasures = [];
  if (userData != "") {
      var matchUserDataRows = AGGDATA.filter(x=>x.name == userData)
  
      for (i in matchUserDataRows) {
        var matchRow = matchUserDataRows[i];
        var d = {};
        d['state'] = matchRow.name;
        d['date'] = matchRow.peak_deaths_date;
        d['beds'] = matchRow.bed_shortage;
        d['death_peak'] = matchRow.peak_deaths;
        d['deaths'] = matchRow.total_deaths;
        d['peak_deaths_min'] = matchRow.peak_deaths_min;
        d['peak_deaths_max'] = matchRow.peak_deaths_max;
        d['bed_shortage_min'] = matchRow.bed_shortage_min;
        d['bed_shortage_max'] = matchRow.bed_shortage_max;
        d['total_low_deaths'] = matchRow.total_low_deaths;
        d['total_high_deaths'] = matchRow.total_high_deaths;
        d['bed_range'] = d['bed_shortage_min'] == d['bed_shortage_max'] ? fmtComma(d['bed_shortage_min']) : fmtComma(d['bed_shortage_min']) + " - " + fmtComma(d['bed_shortage_max'])
        d['peak_deaths_range'] = d['peak_deaths_min'] == d['peak_deaths_max'] ? fmtComma(d['peak_deaths_min']) : fmtComma(d['peak_deaths_min']) + " - " + fmtComma(d['peak_deaths_max'])
        userDataMeasures.push(d)

    }
    renderAutoText(userDataMeasures);


  };





})







//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded();
