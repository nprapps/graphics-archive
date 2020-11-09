var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
  ...require("d3-voronoi/dist/d3-voronoi.min"),
  ...require("d3-array/dist/d3-array.min")
};

var { COLORS, classify, makeTranslate, getAPMonth, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev, monthDay, dateFull } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // console.log(config)

  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var selectedState = config.params.get("state");
  if (selectedState == null) {
    selectedState = "us"
  }

  var stateData = config.state_names.find(d => d.slug == selectedState);
  var stateName = stateData.label;
  var stateHeadline = stateData.headline;
  var stateHeadline = stateData.headline_alt;

  // d3.select(".headline").text(stateHeadline)
  // d3.select()
  // if (selectedState == "us") {
  //   d3.select(".subhead").html(subhedAlt)  
  // }

  // if (isMobile.matches) {
  //   d3.select(".mobileChange").html(mobileChange)
  // }
  
  var makeDate = function(d) {
    var [m, day, y] = d.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    return new Date(y, m - 1, day);
  }  

  var labelMaker = function(d) {
      var item = lastItem(d);      
      // var value = item[valueColumn];
      
      // var label = value == 0 ? 0 : value.toFixed(1);
      // var label = value;
      // var sign = Math.sign(label) == 1 ? "+" : "";      

      var name = config.state_names.find(element => element.slug == d.name.toLowerCase()).label;
      // var name = d.name;   
      if (!isMobile.matches) {        
      } else {
        var name = config.state_names.find(element => element.slug == d.name.toLowerCase()).upper;        
      }

      label = name;

      return label;
  }

  var margins = {
    top: 5,
    right: 100,
    bottom: 20,
    left: 40
  };

  let labelXoffset = 20,
      labelYoffset = 5,
      additionalYoffset = 30;

  let noteLength = 300;

  var ticksX = 4;
  var ticksY = 5;
  var roundTicksFactor = 0.05;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 40;
    labelYoffset = 4;
    noteLength = 200;
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
  var max = Math.max.apply(null, ceilings);
  var max = 6;

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
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  var legend = containerElement
    .append("ul")
    .attr("class", "key" + oneLine)
    .selectAll("g")
    .data(config.data.filter(function(d){        
      return (d.name.toLowerCase() == selectedState) || (d.name.toLowerCase() == "us") ;
    }))
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d.name));

  legend.append("b").style("background-color", d => colorScale(d.name));

  legend.append("label").text(d => d.name);

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

  var dates = ["7/13/2020","7/20/2020","7/27/2020","8/3/2020","8/10/2020","8/17/2020"];
  var fomrattedDates = [];
  for (var i = 0; i < dates.length; i++) {
    fomrattedDates.push(makeDate(dates[i]));
  }


  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    // .ticks(ticksX)
    .tickValues(fomrattedDates)
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return `${monthDay(d)}`;
      } else {
        return `${monthDay(d)}`;
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => `${d.toFixed(0)*100}%`);

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

  // render background colors

  var bgs = chartElement
    .append("g")
      .attr("class","bgs")
      
  bgs.append("rect")
        .attr("class","bg good")
        .attr("width",chartWidth)
        .attr("height",chartHeight - yScale(max-1))




  bgs.append("rect")
        .attr("class","bg bad")
        .attr("width",chartWidth)
        .attr("height",chartHeight - yScale(1))
        .attr("y",yScale(1))    
    // .attr("")


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
// 
  // if (min < 0) {
    // chartElement
    //   .append("line")
    //   .attr("class", "zero-line")
    //   .attr("x1", 0)
    //   .attr("x2", chartWidth)
    //   .attr("y1", yScale(1))
    //   .attr("y2", yScale(1));
  // }

  // Render lines to chart.
  var line = d3
    .line()
    .curve(d3.curveCatmullRom.alpha(0.5))
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  var annoLine = d3
    .line().curve(d3.curveBundle.beta(1))
    .x(d => d.x)
    .y(d => d.y)

  var voronoi = d3.voronoi()
    .x(function(d) { return xScale(d[dateColumn]); })
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
      let isActive = selectedState == d.name.toLowerCase() ? "active" : "";
      return `line ${classify(d.name)} ${isActive}`
    })
    // .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  var dots = chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data(config.data)
    .enter()
      .append("g")
      .attr('class',function(d){
        
        var isActive = ((d.name.toLowerCase() == selectedState) || (d.name.toLowerCase() == "us")) ? "active" : "" ;
        return `${classify(d.name)} ${isActive}`
      })

  dots.selectAll("circle")
    .data(function(d, i) {
      d.values.forEach(function(v,k) {
        v.series = d.name;
      });
      return d.values;
    })
    .enter()
      .append("circle")
      .attr("cx", d => xScale(d[dateColumn]))
      .attr("cy", d => yScale(d[valueColumn]))
      .attr("stroke","#fff")
      .attr("r", 3.5);

  var numbers = chartElement
    .append("g")
    .attr("class", "numbers")
    .selectAll("g")
    .data(config.data)
    .enter()
      .append("g")
      .attr('class',function(d){
        
        var isActive = ((d.name.toLowerCase() == selectedState) || (d.name.toLowerCase() == "us")) ? "active" : "" ;
        return `${classify(d.name)} ${isActive}`
      })

  numbers.selectAll("text")
    .data(function(d, i) {
      d.values.forEach(function(v,k) {
        v.series = d.name;
      });
      return d.values;
    })
    .enter()
      .append("text")
      .attr("x", d => xScale(d[dateColumn]))
      .attr("y", d => yScale(d[valueColumn]))
      .attr("dy",-10)
      .attr("dx",-10)
      // .attr("stroke","#fff")
      .text(function(d){
        var amount = +d[valueColumn];
        return `${Math.round(amount.toFixed(3)*100)}%`;
      })


  // bring the selection to front
  d3.selectAll(".active").raise();

  var voronoiGroup = chartElement.append("g")
    .attr("class", "voronoi");

  // create data with keys inside each data point

  var longData = config.data.map(function(d) { 
    return d.values.map(function(el){
      var o = Object.assign({}, el);
      o.name = d.name.toLowerCase();
      return o;
    }); 
  })

  voronoiGroup.selectAll("path")
    .data(voronoi.polygons(d3.merge(longData)))
    .enter().append("path")
      .attr("d", function(d) { return d ? "M" + d.join("L") + "Z" : null; })
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)      

  function mouseover(d) {

    var name = d.data.name.replace(" ","-");
  
    d3.selectAll(`.dots g.${name}`).classed("highlight",true).raise();
    d3.selectAll(`.numbers g.${name}`).classed("highlight",true).raise();
    d3.select(`.line.${name}`).classed("highlight",true).raise();
  
    d3.selectAll(".anno-line.perm").classed("hide",true)
    d3.selectAll(".value.perm").classed("hide",true)
  
    var lastItem = d => d.values[d.values.length - 1];

    chartElement
      .append("g")
      .attr("class", "anno-line tool")
      .selectAll("path")
      .data(d3.select(`.line.${name}`).data())
      .enter()
      .append("path")
      .attr("d", function(d) {
        var xHere = xScale(lastItem(d)[dateColumn]) + labelXoffset;
        var yHere = yScale(lastItem(d)[valueColumn]);

        var coords = [
          {
            x:xScale(lastItem(d)[dateColumn])+5,
            y:yScale(lastItem(d)[valueColumn])
          },
          {
            x: xHere - 2,
            y: yHere
          }
        ]

        return annoLine(coords);
      })



    chartElement
      .append("g")
      .attr("class", "value tool")
      .selectAll("text")
      .data(d3.select(`.line.${d.data.name}`).data())
      .enter()
      .append("text")
      .attr("class","highlight")
      .attr("x", d => xScale(lastItem(d)[dateColumn]) + labelXoffset)
      .attr("y", d => yScale(lastItem(d)[valueColumn]) + labelYoffset)
      .text(function(d) {
        return labelMaker(d);
      })
      .call(wrapText,80,14);;
  }

  function mouseout(d) {
    d3.selectAll(`.line`).classed("highlight",false)    
    d3.selectAll(`.dots g`).classed("highlight",false) 
    d3.selectAll(`.numbers g`).classed("highlight",false) 

    d3.selectAll(".anno-line.perm").classed("hide",false)
    d3.selectAll(".value.perm").classed("hide",false)

    d3.selectAll(".value.tool").remove();
    d3.selectAll(".anno-line.tool").remove();
    d3.selectAll(".active").raise();

  }

  // console.log(d)
  var lastItem = d => d.values[d.values.length - 1];

  var annotation = chartElement
    .append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.data.filter(function(d){        
      return (d.name.toLowerCase() == selectedState) || (d.name.toLowerCase() == "us") ;
    }))
    .enter();
 
  annotation
    .append("path")
    .attr("class","anno-line perm")
    .attr("d", function(d) {

      var xHere = xScale(lastItem(d)[dateColumn]) + labelXoffset;
      var yHere = yScale(lastItem(d)[valueColumn]);

      var usY = config.data.filter(s => s.name.toLowerCase() == "us");      

      var diff = yScale(lastItem(d)[valueColumn]) - yScale(lastItem(usY[0])[valueColumn]);


      if (d.name != "us") {        
        if (Math.abs(diff) < 20 && Math.sign(diff) == -1  ) {
          yHere = yHere - additionalYoffset;
        }
        if (Math.abs(diff) < 10 && (Math.sign(diff) == 1 || Math.sign(diff) == 0)) {
          yHere = yHere + additionalYoffset;
        }
      }

      var coords = [
        {
          x:xScale(lastItem(d)[dateColumn])+5,
          y:yScale(lastItem(d)[valueColumn])
        },
        {
          x: xHere - 8,
          y: yScale(lastItem(d)[valueColumn])
        },
        {
          x: xHere - 5,
          y: yHere
        },
        {
          x: xHere,
          y: yHere
        }
      ]

      return annoLine(coords);
    })


  chartElement
    .append("g")
    .attr("class", "value perm")
    .selectAll("text")
    .data(config.data.filter(function(d){        
      return (d.name.toLowerCase() == selectedState) || (d.name.toLowerCase() == "us") ;
    }))
    .enter()
    .append("text")    
    .attr("class", d => classify(d.name))
    .attr("x",0)    
    .attr("y",0)
    // .attr("x", d => xScale(lastItem(d)[dateColumn]) + labelXoffset)
    // .attr("y", d => yScale(lastItem(d)[valueColumn]) + labelYoffset)
    .attr("transform",function(d){
      var xHere = xScale(lastItem(d)[dateColumn]) + labelXoffset+3;
      var yHere = yScale(lastItem(d)[valueColumn]) + labelYoffset;

      var usY = config.data.filter(s => s.name.toLowerCase() == "us");      

      var diff = yScale(lastItem(d)[valueColumn]) - yScale(lastItem(usY[0])[valueColumn])
      
      // yes
      // tx,mn,mt,vt, md

      if (d.name != "us") {
        if (Math.abs(diff) < 20 && (Math.sign(diff) == -1 || Math.sign(diff) == 0) == -1 ) {
          yHere = yHere - additionalYoffset;
        }
        if (Math.abs(diff) < 10 && (Math.sign(diff) == 1 || Math.sign(diff) == 0) ) {
          yHere = yHere + additionalYoffset;
        }
      }

      return `translate(${xHere},${yHere})`
    })
    .text(function(d) {
      return labelMaker(d);
    }).call(wrapText,79,14);

  // chartElement
  //   .append("g")
  //   .attr("class", "notes")    
  //   .append("text")    
  //   .attr("x",-margins.left)
  //   .attr("y",-25)
  //   .text(config.textForNote)
  //   .call(wrapText,noteLength,14)


  var pointers = chartElement
    .append("g")
    .attr("class", "pointers")

    pointers.selectAll("circle")
    .data(config.pointers)
    .enter()
      .append("circle")
      .attr('class',function(d){        
        return `dottie id${classify(d.id)}`
      })
      .attr("cx", d => xScale(makeDate(d.x)) + d.dx + 5 - 1)
      .attr("cy", d => yScale(d.y) + d.dy - 5)
      .attr("r", 10)
      // .attr("dy",d => d.dy)
      // .attr("dx",d => d.dx)
      
      // .text(function(d){
      //   return d.id;
      // })
    
    pointers.selectAll("text")
    .data(config.pointers)
    .enter()
      .append("text")
      .attr('class',function(d){        
        return `dot-text id${classify(d.id)}`
      })
      .attr("x", d => xScale(makeDate(d.x)))
      .attr("y", d => yScale(d.y))
      .attr("dy",d => d.dy)
      .attr("dx",d => d.dx)
      // .attr("stroke","#fff")
      .text(function(d){
        return d.id;
      })


  // chartElement
  //   .append("g")
  //   .attr("class", "value explainer")    
  //   .append("text")    
  //   .attr("x",10)
  //   .attr("y",yScale(3)-15)
  //   .html(config.textForNote2)
  //   .call(wrapText,noteLength-20,14)    

  // Define the arrowhead marker variables
  // const markerBoxWidth = 10;
  // const markerBoxHeight = 10;
  // const refX = markerBoxWidth / 2;
  // const refY = markerBoxHeight / 2;
  // const markerWidth = markerBoxWidth / 2;
  // const markerHeight = markerBoxHeight / 2;
  // const arrowPoints = [[0, 0], [0, markerBoxWidth], [markerBoxHeight, markerBoxWidth/2]];

  // annotation
  //   .append('svg:defs')
  //   .append('svg:marker')
  //   .attr('id', 'arrow')
  //   .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
  //   .attr('refX', refX)
  //   .attr('refY', refY)
  //   .attr('markerWidth', markerBoxWidth)
  //   .attr('markerHeight', markerBoxHeight)
  //   .attr('orient', 'auto-start-reverse')
  //   .append('path')
  //   .attr('d', d3.line()(arrowPoints))
  //   .attr('stroke', 'black');

  // annotation
  // .append('path')
  //   .attr("class","anno-line perm")
  //   .attr("marker-end","url(#arrow)")
  //   .attr("d", function() {
  //     var coords = [
  //       {
  //         x:10 + noteLength - 10,
  //         y:yScale(3) - 20
  //       },
  //       {
  //         x: 10 + noteLength + 22,
  //         y: yScale(3) - 20
  //       },
  //       {
  //         x: 10 + noteLength + 22,
  //         y: yScale(0.41) - 30
  //       }
  //     ]

  //     return annoLine(coords);
  //   })

};
