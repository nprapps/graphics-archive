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

//var dropdown = $.one("#dropdown");

var item = (d, i) => d.values[i];
var topItem = d => d.values[d.values.length - 1];
var rightBorderOfDate;

// Render a line chart.
module.exports = function(config) {

  var benchmarksFlagged = [0.5,0.7,0.85];

  // var stateNameHeader = $.one("#nameHeader");
  // var stateDosesHeader = $.one("#dosesAverage");

  var dosesWidth = 225;
  var dosesAdjust = 45;

  // var showState = function(e) {
  //   var val;
  //   if (e.target) {
  //       if (e.target.value == "Select") {
  //         val = 'US'
  //       }
  //       else {
  //         val = e.target.value
  //       };
  //   } else {
  //       val = e;
  //       dropdown.value = e;
  //   }
  //   var stateData = config.state_names.find(d => d.state == val);
  //   selectState(stateData)
  // };
  // if (!config.currentStateDate){
  //   var stateData = config.state_names.find(d => d.state == val);
  //   selectState()
  // }
  //console.log(config)


  //dropdown.addEventListener("input", showState);
  //console.log(dropdown)
  //dropdown[0].selectedIndex = 1;
  //dropdown.selectmenu('refresh');
  //dropdown.change(resetFieldToDefault);
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  //console.log(config.state_names)
  var US_average = fmtComma(Math.round(config.ratesData.filter(r => r.state == 'US')[0].rate))
  //var subhed_rate = document.querySelector('#us-doses')
  //subhed_rate.innerHTML = US_average;

  var stateName = config.currentStateData.state_name;

  var percentMaker = function(d,index){
    var dta = item(d,index)
    var value = dta[valueColumn];
    var label = Math.round(value*100);

    return label + "% fully vaccinated"

  }

  var labelMaker = function(d,index) {

      //console.log("label maker index: " + index)
      var dta = item(d,index);
      var value = dta[valueColumn];
      var percentage = Math.round(value*100);

      var label;
        if (yearFull(new Date(dta.date))!='2021'){
          label = `${monthDay(new Date(dta.date))}, ${yearFull(new Date(dta.date))}`
        }
        //
        else {
          label = `${monthDay(new Date(dta.date))}`
        }

      if (index == 0){
        //console.log("hello")
        return label + ": "// + percentage + "% fully vaccinated"
      }

      return label;
  }

  var margins = {
    top: 45,
    right: 40,
    bottom: 25,
    left: 40,
  };

  let labelXoffset = 15,
      percentAdjustment = 125,
      labelYoffset = 5;

  var ticksX = 6;
  var ticksY = 3;
  var roundTicksFactor = 0.05;

  // Mobile
  if (isMobile.matches) {
    dosesWidth = 175;
    dosesAdjust = 20;
    ticksX = 3;
    ticksY = 3;
    margins.right = 35;
    margins.left = 35;
    margins.top = 35;
    labelXoffset = 10;
    labelYoffset = 4;
    percentAdjustment = 80;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;

  var wrapTextWidth = chartWidth/7

  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d.date);
  //var extent = [dates[0], dates[dates.length - 1]];
  finalDate = dates[dates.length - 1]
  maxDate = finalDate
  config.state_names.forEach(function(state){
    var stateDate = new Date(state.values[state.values.length - 1]['date'])
    if (stateDate > maxDate){
      maxDate = stateDate;
    }

  })
  
  var extent = [new Date('3/14/2021, 4:00:00 AM'),maxDate.addDays(30)]

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var values = config.state_names.reduce(
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

  // var oneLine = config.data.length > 1 ? "" : " one-line";

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
    .tickValues([0,0.5,0.7,0.85])
    .tickFormat(function (d) {
      // if (d==0.85){
      //   return `${d*100}%`
      // }

      return `${d*100}%`

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

  function monthDiff(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
  }

  var numQuarters = Math.ceil(monthDiff(dates[0],maxDate)/3)

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
    .attr("height", yScale(0.5))
    .attr("width", chartWidth)

    // chartElement
    //   .append("g")
    //   .attr("class", "text immunity")
    //   .append("text")
    //   .attr("x", d => xScale(dates[0])+5)
    //   .attr("y", d => yScale(0.8))
    //   .text("Herd immunity range")
    //   .call(wrapText,70,12)


  chartElement
      .append("line")
      .attr("class", "line_percentage")
      .attr("x1", xScale(new Date("03-14-2021")))
      .attr("x2", chartWidth)
      .attr("y1", yScale(0.85))
      .attr("y2", yScale(0.85))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);

  chartElement
      .append("line")
      .attr("class", "line_percentage")
      .attr("x1", xScale(new Date("03-14-2021")))
      .attr("x2", chartWidth)
      .attr("y1", yScale(0.7))
      .attr("y2", yScale(0.7))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);

    chartElement
      .append("line")
      .attr("class", "line_percentage")
      .attr("x1", xScale(new Date("03-14-2021")))
      .attr("x2", chartWidth)
      .attr("y1", yScale(0.5))
      .attr("y2", yScale(0.5))
      .attr("stroke",'#999999')
      .attr("opacity",0.25);



  // Render lines to chart.
  var line = d3
    .line()
    // .curve(d3.curveStepBefore)
    .x(d => xScale(new Date(d[dateColumn])))
    .y(d => yScale(d[valueColumn]));

  var voronoi = d3.voronoi()
    .x(function(d) { return xScale(new Date(d[dateColumn])); })
    .y(function(d) { return yScale(d[valueColumn]); })
    .extent([[0, 0], [chartWidth, chartHeight]]);

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", function(d){

      let isActive = config.selectedState == d.name.toLowerCase() ? "active" : "";
      return `line1 ${classify(d.name.toLowerCase())} ${isActive}`
    })
    .attr("d", d => line(d.values))

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.state_names)
    .enter()
    .append("path")
    .attr("class", function(d){

      let isActive = config.selectedState == d.state_name.toLowerCase() ? "active" : "";
      
      return `line ${classify(d.state_name)} ${isActive}`
    })
    .attr("d", d => line(d.values))
    .style("stroke-dasharray", ("5, 2"))  // <== This line here!!;

  var dots = chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data(config.state_names)
    .enter()
      .append("g")
      .attr('class',function(d){

        var isActive = ((d.state_name.toLowerCase() == config.selectedState) || (d.state_name.toLowerCase() == "us")) ? "active" : "" ;
        return `${classify(d.state_name)} ${isActive}`
      })


  dots.selectAll("circle")
    .data(function(d, i) {
      d.values.forEach(function(v,k) {
        v.series = d.state_name;
      });
      var first = d.values.slice(0,1);
      var flagged = d.values.filter(d => (benchmarksFlagged.includes(d.amt)) && (d.amt > first[0].amt))
      var returnArray = first.concat(flagged)
      return returnArray;
    })
    .enter()
      .append("circle")
      .attr("cx", d => xScale(new Date(d[dateColumn])))
      .attr("cy", d => yScale(d[valueColumn]))
      .attr("fill",'#808080')
      .attr("r", function (d){
        if (isMobile.matches){
          return 3;
        }

        else {
          return 4;
        }
      });

// bring the selection to front
  d3.selectAll(".active").raise();


  if (!isMobile.matches){
    var voronoiGroup = chartElement.append("g")
    .attr("class", "voronoi");

  // create data with keys inside each data point

  var longData = config.state_names.map(function(d) {
    return d.values.map(function(el){
      var o = Object.assign({}, el);
      o.name = d.state_name.toLowerCase();
      
        return o;
      
    });
  })

  //console.log(longData)

  voronoiGroup.selectAll("path")
    .data(voronoi.polygons(d3.merge(longData)))
    .enter().append("path")
      .attr("d", function(d) { return d ? "M" + d.join("L") + "Z" : null; })
      .attr("fill","#000000")
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      //.on("click", clickie);
  }


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


  function mouseover(d) {

    d3.selectAll(`.line`).classed("highlight",false)
    d3.selectAll(`.dots g`).classed("highlight",false)
    d3.selectAll(`.line1`).classed("highlight",false)
    d3.selectAll(`.value text`).classed("highlight",false)
    d3.selectAll(`text.selected`).style("display",'none');
    d3.selectAll(`text.dropdown_selected`).style("fill-opacity",0);
    var class_name,class_abbrev,values,rateState;
    class_name = d.data.name;

    if (class_name == 'new york'){
      class_abbrev = "NY"
    }else {
      class_abbrev = window.KEY[capitalizeFirstLetter(class_name)].abbrev
    }

    //selectedState = class_abbrev;

    d3.selectAll(`.dots g.${classify(class_name)}`).classed("highlight",true).raise();
    d3.select(`.line.${classify(class_name)}`).classed("highlight",true).raise();
    d3.select(`.line1.${classify(class_abbrev)}`).classed("highlight",true).raise();
    var stateValues = config.state_names.filter(x => x.state == class_abbrev)[0].values

    chartElement
      .append("g")
      .attr("class", "value tool")
      .selectAll("text")
      .data(d3.select(`.line.${classify(class_name)}`).data())
      .enter()
      .append("text")
      .attr("class", d => `highlight state_name ${classify(class_name)}`)
      .attr("x", function (d) {
        var xVal = xScale(new Date(topItem(d)[dateColumn]))+ labelXoffset-40;
        //var xLocation = (xScale(new Date(item(d,i)[dateColumn])) + labelXoffset)
        wrapTextWidth = chartWidth - xVal;
        return xVal;
      })
      .attr("y", d => yScale(topItem(d)[valueColumn]) + labelYoffset - 10)
      .html(function(d) {
        return d['state_name']
      }).call(wrapText,wrapTextWidth,12);

    renderLabels(stateValues,class_name,'highlight')


  }

  function selectState(d){
    var class_name,class_abbrev,values,rateState;

    class_name = d.state_name;
    class_abbrev = d.state;

    var state_name_show = d.state_name

    if (state_name_show == 'United States'){
      var state_name_show = 'the United States'
    }

    d3.selectAll(`.line`).classed("selected",false)
    d3.selectAll(`.dots g`).classed("selected",false)
    d3.selectAll(`.line1`).classed("selected",false)
    d3.selectAll(".selected").remove();
    d3.selectAll(".value tool").remove();


    rateState = config.ratesData.filter(z => (z.state == class_abbrev))
    //selectedState = class_abbrev;

    chartElement
      .append("g")
      .attr("class", "value tool")
      .selectAll("text")
      .data(d3.select(`.line.${classify(class_name)}`).data())
      .enter()
      .append("text")
      .attr("class", d => `dropdown_selected state_name ${classify(class_name)}`)
      .attr("x", function (d) {
        var xVal = xScale(new Date(topItem(d)[dateColumn]))+ labelXoffset-40;
        //var xLocation = (xScale(new Date(item(d,i)[dateColumn])) + labelXoffset)
        wrapTextWidth = chartWidth - xVal;
        return xVal;
      })
      .attr("y", d => yScale(topItem(d)[valueColumn]) + labelYoffset - 10)
      .attr("fill","black")
      .html(function(d) {
        return d['state_name']
      }).call(wrapText,wrapTextWidth,12);

    //stateNameHeader.innerHTML = `<span id="${classify(class_name)}">${class_name}</span>`

    var highlightDate = new Date(d.values.find(d => d.amt == 0.5).date)
    var highlightDateShow = monthDay(highlightDate);
    if (yearFull(highlightDate)=='2022'){
      highlightDateShow = monthDay(highlightDate) + ", " + yearFull(highlightDate);
    }

    var highlightDate2 = new Date(d.values.find(d => d.amt == 0.7).date)
    var highlightDateShow2 = monthDay(highlightDate2);
    if (yearFull(highlightDate2)=='2022'){
      highlightDateShow2 = monthDay(highlightDate2) + ", " + yearFull(highlightDate2);
    }

    //stateDosesHeader.innerHTML = `At the <span id="current_rate">current rate</span> of ${Math.round(rateState[0].rate).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} new fully vaccinated people each day, ${state_name_show} could reach 70% full vaccination by <span style="font-weight:bold">${highlightDateShow}</span>.</span>`
    //stateDosesHeader.innerHTML = `At the current average rate of new fully vaccinated people each day, ${state_name_show} could fully vaccinate 50% of people by <span style="font-weight:bold">${highlightDateShow}</span>.</span>`
    var stateValues = d.values//config.state_names.filter(x => x.state == class_abbrev)[0].values


    d3.selectAll(`.dots g.${classify(class_name)}`).classed("selected",true).raise();
    d3.select(`.line.${classify(class_name)}`).classed("selected",true).raise();
    d3.select(`.line1.${classify(class_abbrev)}`).classed("selected",true).raise();

    renderLabels(stateValues,class_name,'selected')

  }

  function mouseout(d) {
    d3.selectAll(`.line`).classed("highlight",false)
    d3.selectAll(`.dots g`).classed("highlight",false)
    d3.selectAll(`.line1`).classed("highlight",false)
    d3.selectAll(".highlight").remove();
    //d3.selectAll(".highlight").remove();
    //d3.selectAll(".value tool .highlight").remove();
    d3.selectAll(`text.selected`).style("display",'block');
    d3.selectAll(`text.dropdown_selected`).style("fill-opacity",1);
  }


  function renderLabels(stateValues,class_name,class_show){
    //console.log(stateValues[0].amt)
    for (var i = 0; i < stateValues.length; i++) {
      if ((benchmarksFlagged.includes(stateValues[i].amt) && (stateValues[i].amt - stateValues[0].amt > 0.03)) || i == 0){
        
        if (i == 0){
          chartElement
            .append("g")
            .attr("class", "value tool")
            .selectAll("text")
            .data(d3.select(`.line.${classify(class_name)}`).data())
            .enter()
            .append("text")
            .attr("class", d => `${class_show} ${classify(class_name)}`)
            .attr("id","percent_fully_vaccinated")
            .attr("x", function (d){
              var xLocation = (xScale(new Date(item(d,i)[dateColumn])) + labelXoffset)
              wrapTextWidth = chartWidth - xLocation;
              return xLocation
            })
            .attr("y", d => yScale(item(d,i)[valueColumn]) + labelYoffset)
            .html(function(d) {
              return labelMaker(d,i);
            }).call(wrapText,wrapTextWidth,14)

        }

        else {
          chartElement
            .append("g")
            .attr("class", "value tool")
            .selectAll("text")
            .data(d3.select(`.line.${classify(class_name)}`).data())
            .enter()
            .append("text")
            .attr("class", d => `${class_show} ${classify(class_name)}`)
            //.attr("id","percent_fully_vaccinated")
            .attr("x", function (d){
              var xLocation = (xScale(new Date(item(d,i)[dateColumn])) + labelXoffset)
              wrapTextWidth = chartWidth - xLocation;
              return xLocation
            })
            .attr("y", d => yScale(item(d,i)[valueColumn]) + labelYoffset)
            .html(function(d) {
              return labelMaker(d,i);
            }).call(wrapText,wrapTextWidth,14)
        }

        if (!rightBorderOfDate){
          var rightBorderOfDate = document.querySelector(`text.${class_show}#percent_fully_vaccinated`).getBBox().x + document.querySelector(`text.${class_show}#percent_fully_vaccinated`).getBBox().width
        }

        if (i == 0){ //&& class_show =='selected'){

          chartElement
          .append("g")
          .attr("class", "value tool")
          .selectAll("text")
          .data(d3.select(`.line.${classify(class_name)}`).data())
          .enter()
          .append("text")
          .attr("class", d => `${class_show} national percentage ${classify(class_name)}`)
          .attr("id",d=> `p_${String(item(d,i)[valueColumn]).replace(".","")}`)
          //.attr("class","highlight ")
          .attr("x", d => rightBorderOfDate + 5) //- (isMobile.matches ? 30 : 35))
          .attr("y", d => yScale(item(d,i)[valueColumn]) + labelYoffset)
          .html(function(d) {
            return percentMaker(d,i)//(item(d,i)[valueColumn]);
          })
        }

    }
  }
  }

  selectState(config.currentStateData)


};
