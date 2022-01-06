var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
  ...require("d3-voronoi/dist/d3-voronoi.min"),
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-time/dist/d3-time.min")
};

var $ = require("./lib/qsa");

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

var { COLORS, classify, makeTranslate, wrapText, fmtComma } = require("./lib/helpers");
var { monthDay, yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

var dropdown = $.one("#dropdown");

var item = (d, i) => d.values[i];
var topItem = d => d.values[d.values.length - 1];

// Render a line chart.
module.exports = function(config) {

  var benchmarksFlagged = [0.5,0.7,0.85];

  //var stateNameHeader = $.one("#nameHeader");
  var stateDosesHeader = $.one("#dosesAverageNational");
 // var stateDosesStart = $.one("#dosesAverageDateStart");
  //var stateDosesEnd = $.one("#dosesAverageDateEnd")
  //var stateDosesDate = $.one("#date70PercentSubhed")

  var dosesWidth = 225;
  var dosesAdjust = 45;

  //console.log(config.data)

  // var showState = function(e) {
  //       var val;
  //       if (e.target) {
  //           if (e.target.value == "Select") {
  //             val = 'US'
  //           }
  //           else {
  //             val = e.target.value
  //           };
  //       } else {
  //           val = e;
  //           dropdown.value = e;
  //       }
  //     var stateData = config.state_names.find(d => d.state == val); 
  //     selectState(stateData)
  //   };

  //dropdown.addEventListener("input", showState);
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;
  var selectedState = 'US';

  var percentMaker = function(d,index){
    var dta = item(d,index)
    var value = dta[valueColumn];
    var label = Math.round(value*100);

    return label + "% fully vaccinated"

  }  

  var labelMaker = function(d,index) {
      var dta = item(d,index);
      var label;
        if (yearFull(new Date(dta.date))!='2021'){
          label = `${monthDay(new Date(dta.date))}, ${yearFull(new Date(dta.date))}`
        }
        // 
        else {
          label = `${monthDay(new Date(dta.date))}`
        }

      if (index == 0){
        return label + ": "
      }
      return label;
  }

  var margins = {
    top: 10,
    right: 0,
    bottom: 30,
    left: 45
  };

  let labelXoffset = 15,
      percentAdjustment = 70,
      labelYoffset = 5,
      additionalYoffset = 0;

  let noteLength = 400;

  var ticksX = 6;
  var ticksY = 4;
  var roundTicksFactor = 0.05;

  var wrapTextWidth = 90;

  // Mobile
  if (isMobile.matches) {
    dosesWidth = 175;
    dosesAdjust = 20;
    ticksX = 4;
    ticksY = 4;
    margins.right = 0;
    margins.left = 40;
    labelXoffset = 10;
    labelYoffset = 4;
    noteLength = 200;
    wrapTextWidth = 60;
    percentAdjustment = 60;
  }
  // Mobile
  // if (isMobile.matches) {
  //   ticksX = 5;
  //   ticksY = 5;
  //   margins.right = 10;
  // }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.futureData[0].values.map(d => d.date);

  var maxDate = new Date(dates[dates.length - 1])
  var extent = [new Date('Sun Dec 13 2020 00:00:00 GMT-0500'),maxDate.addDays(30)]

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var values = config.futureData.reduce(
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
  //var max = Math.max.apply(null, ceilings);
  var max = 1;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  // Render the HTML legend.


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
    // .tickValues([new Date('03-01-2021'),
    //              new Date('07-01-2021'),
    //              new Date('10-01-2021'),
    //              new Date('01-01-2022'),
    //              new Date('03-01-2022'),
    //              new Date('06-01-2022')])
    //.ticks(d3.timeMonth.every(1))
    .tickFormat(function(d, i) {
        if (yearAbbrev(d) == "22"){
          if (monthDay(d).split(" ")[0]=='Jan.'){
            if (isMobile.matches){
              return `${monthDay(d).split(" ")[0]} '22` 
            }
            return `${monthDay(d).split(" ")[0]} 2022`
          }
          return `${monthDay(d)} `
        }
        else if (yearAbbrev(d) == "23"){
          if (monthDay(d).split(" ")[0]=='Jan.'){
            return `${monthDay(d).split(" ")[0]} 2023`
          }
          return `${monthDay(d)} `
        }
        else {
          return `${monthDay(d)} `
        }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    //.ticks(ticksY)
    .tickValues([0,0.7,0.5,0.85,1])
    .tickFormat(d => `${d*100}%`)

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

  var quarterColor = 248;
  var month = 4;
  var year = 2021;
  var nextMonth = 7;
  var nextYear = 2021;

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat(d => "")
    );

  chartElement
      .append("line")
      .attr("class", "line_year")
      .attr("x1", xScale(new Date(config.futureData[0].values[0].date)))
      .attr("x2", xScale(new Date(config.futureData[0].values[0].date)))
      .attr("y1", chartHeight)
      .attr("y2", yScale(config.futureData[0].values[0].amt))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);

  chartElement
      .append("line")
      .attr("class", "line_year")
      .attr("x1", xScale(new Date(config.futureData[0].values[1].date)))
      .attr("x2", xScale(new Date(config.futureData[0].values[1].date)))
      .attr("y1", chartHeight)
      .attr("y2", yScale(0.5))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);

  chartElement
      .append("line")
      .attr("class", "line_year")
      .attr("x1", xScale(new Date(config.futureData[0].values[2].date)))
      .attr("x2", xScale(new Date(config.futureData[0].values[2].date)))
      .attr("y1", chartHeight)
      .attr("y2", yScale(0.7))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);

  chartElement
      .append("line")
      .attr("class", "line_year")
      .attr("x1", xScale(new Date(config.futureData[0].values[3].date)))
      .attr("x2", xScale(new Date(config.futureData[0].values[3].date)))
      .attr("y1", chartHeight)
      .attr("y2", yScale(0.85))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);

  chartElement
      .append("line")
      .attr("class", "line_percentage")
      .attr("x1", xScale(new Date("12-13-2020")))
      .attr("x2", xScale(new Date(config.futureData[0].values[3].date)))
      .attr("y1", yScale(0.85))
      .attr("y2", yScale(0.85))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);

  chartElement
      .append("line")
      .attr("class", "line_percentage")
      .attr("x1", xScale(new Date("12-13-2020")))
      .attr("x2", xScale(new Date(config.futureData[0].values[2].date)))
      .attr("y1", yScale(0.7))
      .attr("y2", yScale(0.7))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);

    chartElement
      .append("line")
      .attr("class", "line_percentage")
      .attr("x1", xScale(new Date("12-13-2020")))
      .attr("x2", xScale(new Date(config.futureData[0].values[1].date)))
      .attr("y1", yScale(0.5))
      .attr("y2", yScale(0.5))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);

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

    // chartElement
    // .append("rect")
    // .attr("class","year_background")
    // .attr("x",0)
    // .attr("y", yScale(0.85))
    // .attr("height", yScale(0.7) - yScale(0.85))
    // .attr("width", chartWidth)
    // .attr("fill",COLORS.teal3 + '26')//"#E8E8E8")

    //     chartElement
    // .append("rect")
    // .attr("class","year_background")
    // .attr("x",0)
    // .attr("y", 0)
    // .attr("height", yScale(0.85))
    // .attr("width", chartWidth)
    // .attr("fill",COLORS.teal3 + '4D')//"#E8E8E8")




    ///GRADIENT
    var svgDefs = chartElement.append('defs');

    var mainGradient = svgDefs.append('linearGradient')
        .attr('id', 'mainGradient')
        .attr("gradientTransform","rotate(90)");

            // Create the stops of the main gradient. Each stop will be assigned
            // a class to style the stop using CSS.
            mainGradient.append('stop')
                .attr('class', 'stop-left')
                .attr('offset', '0');

            mainGradient.append('stop')
                .attr('class', 'stop-right')
                .attr('offset', '1');

    chartElement
    .append("rect")
    .attr("class","filled")
    .attr("x",0)
    .attr("y", 0)
    .attr("height", yScale(0.6))
    .attr("width", chartWidth)









  // Render lines to chart.
  var line = d3
    .line()
    // .curve(d3.curveStepBefore)
    .x(d => xScale(new Date(d[dateColumn])))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", function(d){
      
      let isActive = selectedState == d.name.toLowerCase() ? "active" : "";
      return `line1 ${classify(d.name.toLowerCase())} ${isActive}`
    })
    .attr("d", d => line(d.values))

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.futureData)
    .enter()
    .append("path")
    .attr("class", function(d){
      
      let isActive = selectedState == d.state_name.toLowerCase() ? "active" : "";
      //console.log(d)
      return `line ${classify(d.state_name)} ${isActive}`
    })
    .attr("d", d => line(d.values))
    .style("stroke-dasharray", ("5, 2"))  // <== This line here!!;

  var dots = chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data(config.futureData)
    .enter()
      .append("g")
      .attr('class',function(d){
        
        var isActive = ((d.state_name.toLowerCase() == selectedState) || (d.state_name.toLowerCase() == "us")) ? "active" : "" ;
        return `${classify(d.state_name)} ${isActive}`
      })


  dots.selectAll("circle")
    .data(function(d, i) {
      d.values.forEach(function(v,k) {
        v.series = d.Location;
      });
      //console.log(d.values)
      var first = d.values.slice(0,1);
      var flagged = d.values.filter(d => (benchmarksFlagged.includes(d.amt)))
      var returnArray = first.concat(flagged)
      return returnArray;
      //return 
    })
    .enter()
      .append("circle")
      .attr("cx", d => xScale(new Date(d[dateColumn])))
      .attr("cy", d => yScale(d[valueColumn]))
      .attr("fill",'#808080')
      .attr("r", function (d){
        if (isMobile.matches){
          return 3.5;
        }

        else {
          return 4;
        }
      });

// bring the selection to front
  d3.selectAll(".active").raise();

  var class_name,class_abbrev,values,rateState;

  //console.log(config.futureData)

    class_name = config.futureData[0].state_name;
    class_abbrev = config.futureData[0].state;

    d3.selectAll(`.line`).classed("selected",false)    
    d3.selectAll(`.dots g`).classed("selected",false) 
    d3.selectAll(`.line1`).classed("selected",false) 
    d3.selectAll(".selected").remove();
    d3.selectAll(".value tool").remove();


    rateState = config.ratesData.filter(z => (z.state == class_abbrev))
    selectedState = class_abbrev;

    //stateNameHeader.innerHTML = `<span id="${classify(class_name)}">${class_name.toUpperCase()}</span>`

    var stateValues = config.futureData.filter(x => x.state == class_abbrev)[0].values

    stateDosesHeader.innerHTML = `${(rateState[0].rate).toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
    //stateDosesEnd.innerHTML = `${monthDay(new Date(dates[0])).split(" ")[1]}`
    //stateDosesStart.innerHTML = `${monthDay(new Date(dates[0]).addDays(-7))}`
    //stateDosesDate.innerHTML = `${monthDay(new Date(stateValues[1].date))}`

    
    

    d3.selectAll(`.dots g.${classify(class_name)}`).classed("selected",true).raise();
    d3.select(`.line.${classify(class_name)}`).classed("selected",true).raise();
    d3.select(`.line1.${classify(class_abbrev)}`).classed("selected",true).raise();

    //renderLabels(stateValues,class_name,'highlight')

    //function renderLabels(stateValues,class_name,class_show){
    //console.log(stateValues)
    for (var i = 0; i < stateValues.length; i++) {
      if (benchmarksFlagged.includes(stateValues[i].amt) || i == 0){

          if (i == 0){

          chartElement
            .append("g")
            .attr("class", "value tool")
            .selectAll("text")
            .data(d3.select(`.line.${classify(class_name)}`).data())
            .enter()
            .append("text")
            .attr("class", d => `national percentage ${classify(class_name)}`)
            .attr("id",d=> `p_${String(item(d,i)[valueColumn]).replace(".","")}`)
            //.attr("class","highlight ")
            .attr("x", d => xScale(new Date(dates[0])) + labelXoffset + percentAdjustment)
            .attr("y", d => yScale(item(d,i)[valueColumn]) + labelYoffset)
            .html(function(d) {
              return percentMaker(d,i)//(item(d,i)[valueColumn]);
          })
          }

            chartElement
            .append("g")
            .attr("class", "value tool")
            .selectAll("text")
            .data(d3.select(`.line.${classify(class_name)}`).data())
            .enter()
            .append("text")
            .attr("class", d => `national dateProjection ${classify(class_name)}`)
            //.attr("class","highlight ")
            .attr("x", d => xScale(new Date(item(d,i)[dateColumn])) + labelXoffset)
            .attr("y", d => yScale(item(d,i)[valueColumn]) + labelYoffset)
            .html(function(d) {
              return labelMaker(d,i);
            }).call(wrapText,wrapTextWidth,14)
          
        //if (class_show == 'selected' || i != 0){

            
        //}

        
        
    }
  }
  //}

  

  function capitalizeFirstLetter(string) {
    let words = string.split(" ");
    
    var str = words.map((word) => { 
      if (word == "of"){
        return "of"
      }
      return word.charAt(0).toUpperCase() + word.slice(1); 
    }).join(" ");
    
  
    return str
    //return string.charAt(0).toUpperCase() + string.slice(1);
}


};
