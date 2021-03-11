var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");
var types = ["urban", "suburban", "rural"];
var states = ["Arizona", "Michigan", "Pennsylvania", "Wisconsin", "Georgia"];

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn, voteMarginColumn } = config;

  var FILTERDATA = [...config.data];
  // console.log(config.data);
  FILTERDATA = FILTERDATA.filter(x => x.state == config.state);
  // console.log(FILTERDATA);

  var returnStateTotal = function() {
    var stateTotal = 0;
    for (i in FILTERDATA) {
      stateTotal += FILTERDATA[i][0].winner_margin;
    }
    return stateTotal;
  }

    var containerElement = d3.select(config.container);

    var chartWrapper = containerElement
      .append("div")
      .attr("class", "graphic-wrapper state-" + classify(config.state));

    chartWrapper.append("div")
        .attr("class", "state-title")
        .html(config.state)

    chartWrapper.append("div")
      .attr("class", "state-total")
      // .html("Biden net margin: " + (returnStateTotal() * -1).toLocaleString() + " votes")
      .html(function() {
        if (returnStateTotal() < 0) {
          return "Biden won " + FILTERDATA[0][0].state + " by: " + '<span class="total-label won">' + (returnStateTotal()* -1).toLocaleString() + " votes" + '</span>';
        } else {
          return "Biden won " + FILTERDATA[0][0].state + " by: " + '<span class="total-label lost">' + returnStateTotal().toLocaleString() + " votes" + '</span';
        }
      })

    var values = FILTERDATA.reduce(
      (acc, d) => acc.concat(d.map(v => v[valueColumn])),
      []
    );

    var roundTicksFactor = 5;

    var floors = values.map(
      v => Math.floor(v / roundTicksFactor) * roundTicksFactor
    );
    var min = Math.min.apply(null, floors);

    if (min > 0) {
      min = 0;
    }

    // console.log(floors)

    var ceilings = values.map(
      v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
    );
    var max = Math.max.apply(null, ceilings);


    for (i in types) {
    	var chartselector = document.getElementById(types[i])
    	// render your chart in chartselector
    	var PLACEDATA = FILTERDATA.filter(d => d.type == types[i])
      // console.log(PLACEDATA)

      var returnCountyTotal = function() {
        var countyTotal = 0;
        for (i in PLACEDATA) {
          countyTotal++;
        }
        return countyTotal > 1 ? countyTotal + " counties" : countyTotal + " county";
      }

    	// make subcharts


      var aspectWidth = isMobile.matches ? 4 : 16;
      var aspectHeight = isMobile.matches ? 1.5 : 4;

      var labelWidth = 150;
      var labelGap = 10;

      var margins = {
        top: 40,
        right: 40,
        bottom: 30,
        left: 40
      };

      var ticksX = 5;
      var ticksY = 3;
      // var roundTicksFactor = 5;

      // Mobile
      if (isMobile.matches) {
        ticksX = 4;
        ticksY = 3;
        margins.right = 25;
        labelWidth = 100;
      }

      // Calculate actual chart dimensions
      var chartWidth = (config.width - margins.left - margins.right - labelWidth);
      var chartHeight =
        Math.ceil((config.width * aspectHeight) / aspectWidth) -
        margins.top -
        margins.bottom;

      // Clear existing graphic (for redraw)
      var containerElement = d3.select(config.container);
      // containerElement.html("");

      var dates = PLACEDATA[0].map(d => d.date);
      var extent = [dates[0], dates[dates.length - 1]];

      var yScale = d3
        // .scaleTime()
        .scaleLinear()
        .domain(extent)
        // .range([0, chartWidth]);
        .range([chartHeight, 0]);

      // var values = PLACEDATA.reduce(
      //   (acc, d) => acc.concat(d.map(v => v[valueColumn])),
      //   []
      // );
      //
      // var floors = values.map(
      //   v => Math.floor(v / roundTicksFactor) * roundTicksFactor
      // );
      // var min = Math.min.apply(null, floors);
      //
      // if (min > 0) {
      //   min = 0;
      // }
      //
      // var ceilings = values.map(
      //   v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
      // );
      // var max = Math.max.apply(null, ceilings);

      var xScale = d3
        .scaleLinear()
        .domain([min, max])
        // .range([chartHeight, 0]);
        .range([0, chartWidth]);

      var colorScale = d3
        .scaleThreshold()
        .domain([min, 0, max])
          // config.data.map(function(d) {
          //   return d.name;
          // })
        // )
        .range([
          "#2B7BBD",
          "#2B7BBD",
          // "#adcdeb",
          // "#f8b1ab",
          "#D61F21",
          "#D61F21",
        ]);


      var marginMin = 0;
      var marginMax = 2000000;

      var voteScale = d3
         .scaleLinear()
         .domain([marginMin,marginMax])
         .range([2,25])

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

      var returnTypeTotal = function() {
        var typeTotal = 0;
        for (i in PLACEDATA) {
          typeTotal += PLACEDATA[i][0].winner_margin;
        }
        return typeTotal;
      }

      var returnTypeMargin

      var chartWrapper = containerElement
        .append("div")
        .attr("class", "sub-wrapper state-" + classify(config.state));

      var typeText = chartWrapper
        // .append("g")
        .append("div")
        .attr("class", "type-wrapper")
        .append("div")
        .attr("class", "type-group")
        .style("width", labelWidth + "px")
        .style("padding-right", labelGap + "px")

      typeText.append("div")
          .attr("class", "type-title")
          .html(types[i])

      typeText.append("div")
        .attr("class", "type-total")
        .html(function() {
          if (returnTypeTotal() < 0) {
            return "In 2020, Biden won by " + '<span class="total-label won">' + (returnTypeTotal()* -1).toLocaleString() + "&nbsp;votes" + '</span>' + " across " + returnCountyTotal();
          } else {
            return "In 2020, Biden lost by " + '<span class="total-label lost">' + returnTypeTotal().toLocaleString() + "&nbsp;votes"  + '</span>' + " across " + returnCountyTotal();
          }
        })

      var chartElement = chartWrapper
        .append("svg")
        .attr("width", chartWidth + margins.left + margins.right)
        .attr("height", chartHeight + margins.top + margins.bottom)
        .attr("class", "subchart-inner")
        .append("g")
        .attr("transform", `translate(${margins.left},${margins.top})`);


      // Create D3 axes.

      var returnPos = function(d) {
        if (d < 0) {
          return -d;
        }
        return d;
      }

      var xAxis = d3
        .axisTop()
        .scale(xScale)
        .ticks(ticksX)
        .tickFormat(d => returnPos(d)/1000 + "K");


      var yAxis = d3
        .axisLeft()
        .scale(yScale)
        // .ticks(ticksY)
        .tickValues(["2016", "2020"])
        .tickFormat(function(d, i) {
          // if (isMobile.matches) {
          //   return "\u2019" + yearAbbrev(d);
          // } else {
          //   return yearFull(d);
          // }
          return d
        });

      // Render axes to chart.

      chartElement
        .append("g")
        .attr("class", "x axis")
        // .attr("transform", makeTranslate(0, chartHeight))
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

      // chartElement
      //   .append("g")
      //   .attr("class", "x grid")
      //   .attr("transform", makeTranslate(0, 0))
      //   .call(
      //     xAxisGrid()
      //       .tickSize(-chartHeight, 0, 0)
      //       .tickFormat("")
      //   );

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
          .attr("y1", 0)
          .attr("y2", chartHeight)
          .attr("x1", xScale(0))
          .attr("x2", xScale(0));
      }

      chartElement
        .append("text")
        .attr("class", "axis-label gop")
        .attr("y", chartHeight + 20)
        .attr("x", xScale(0) + 5)
        .text("More Republican votes →")

      chartElement
        .append("text")
        .attr("class", "axis-label dem")
        .attr("y", chartHeight + 20)
        .attr("x", xScale(0) - 5)
        .attr("text-anchor", "end")
        .text("← More Democratic votes")

      //tooltip
      var tooltip = d3.select("#line-tooltip");
      var tooltip = d3
        .select("#line-chart")
        .append("div")
        .attr("id", "line-tooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .style("background", "#fff")
        .text("");

      var mainLabel = tooltip.append('div').attr('class', 'label main');
      var tooltipTable = tooltip.append('table').attr('class', 'tooltip-table');
      tooltipTable.append('thead')
        .selectAll('th')
        .data(['', '2016', '2020'])
        .enter()
        .append('th')
        .text(function (d) {
          return d;
        });
      var tBody = tooltipTable.append('tbody');

      // Render lines to chart.
      var line = d3
        .line()
        .curve(d3.curveCatmullRom.alpha(0.5))
        .x(d => xScale(d[valueColumn]))
        .y(d => yScale(d[dateColumn]));

      chartElement
        .append("g")
        .attr("class", "lines")
        .selectAll("path")
        .data(PLACEDATA)
        .enter()
        .append("path")
        .attr("class", d => "line " + classify(d.name))
        .attr("d", d => line(d.filter(d => d.state == config.state)))
        // tooltips
        .on("mouseover", function(d) {
          if (isMobile.matches) {
            return;
          }

          mainLabel.text(d.name + " County");
          tBody.text("");

          var matrix = [
            {
              label: "Winning vote margin",
              old: returnPos(d[1].winner_margin).toLocaleString(),
              new: returnPos(d[0].winner_margin).toLocaleString()
            },
            {
              label: "Total votes in county",
              old: d[1].total_votect.toLocaleString(),
              new: d[0].total_votect.toLocaleString()
            }
          ];

          var tr = tBody.selectAll("tr").data(matrix).enter().append("tr");
          var td = tr
            .selectAll('td')
            .data(function (d, i) {
              return Object.values(d);
            })
            .enter()
            .append('td')
            .text(function (d) {
              return d;
            });

            // tooltip positioning
            var x = d[0].winner_margin < min / 2 ? event.pageX + 50 : event.pageX - 230;
            var y = event.pageY - 300;

            tooltip.style("top", y + "px");
            tooltip.style("left", x + "px");

          return tooltip.style("visibility", "visible");
        })
        .on('mouseout', function () {
          return tooltip.style('visibility', 'hidden');
        });

      //Render dots
      var dots = chartElement
        .append("g")
        .attr("class", "dots")
        .selectAll("g")
        .data(PLACEDATA)
        .enter()
          .append("g")
          .attr('class',d => classify(d.name));

      dots.selectAll("circle")
        .data(function(d, i) {
          d.forEach(function(v,k) {
            v.series = d.name;
          });
          return d;
        })
        .enter()
          .append("circle")
          .attr("cy", d => yScale(d[dateColumn]))
          .attr("cx", d => xScale(d[valueColumn]))
          .attr("fill", d => colorScale(d[valueColumn]))
          .attr("stroke-width",function(d){
            var width = 0.5;
            // if (!isMobile.matches) {
            //   width = 0.5;
            // }

            return width;
          })
          .attr("stroke","#fff")
          .attr("r", d => voteScale(d[voteMarginColumn]));

    };
  }
