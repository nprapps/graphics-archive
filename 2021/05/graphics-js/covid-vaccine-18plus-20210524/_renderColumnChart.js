var { isMobile } = require("./lib/breakpoints");
var { COLORS, makeTranslate, classify,wrapText } = require("./lib/helpers");
var { monthDay, yearFull, yearAbbrev } = require("./lib/helpers/formatDate");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

// Render a column chart.
module.exports = function(config) {

  //console.log(config.data)
  var lineDataLength = config.lineData[0].values.length-1;
  var prelimData = window.OFFSET
  var currentTrend = config.lineData[0].values[lineDataLength-prelimData]
  var currentTrendDate = currentTrend.date
  var finalPrelim = config.lineData[0].values[lineDataLength]
  var finalPrelimAmount = finalPrelim.amt
  var finalPrelimDate = finalPrelim.date

  var offsetLabel = isMobile.matches ? 10 : 10;

  // Setup chart container
  var { labelColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 115,
    bottom: 30,
    left: 20
  };

  if (isMobile.matches){
    margins.bottom = 20;
  }

  var ticksY = 4;
  var ticksX = 6;
  var roundTicksFactor = 1000000;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

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

  var defs = chartElement.append("defs")
  var pattern = defs.append("pattern")
    .attr("id","pattern")
    .attr("width",12)
    .attr("height",12)
    .attr("patternUnits","userSpaceOnUse")
    .attr("patternTransform","rotate(45 50 50)")

  pattern.append("line")
    .attr("stroke",COLORS.teal5)
    .attr("stroke-width","24px")
    .attr("y2",12)
  pattern.append("line")
    .attr("stroke",COLORS.teal6)
    .attr("stroke-width","0px")
    .attr("y2",12)
    .attr("stroke-opacity",3)


  var dates = config.data.map(d => new Date(d.date));
  var extent = [dates[0], dates[dates.length - 1]];

  var barWidth = isMobile.matches ? Math.ceil(chartWidth/dates.length) : Math.floor(chartWidth/dates.length)-1;

  // if (isMobile.matches){
  //   barWidth = Math.floor(chartWidth/dates.length);
  // }


  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  // Create D3 scale objects.
  // var xScale2 = d3
  //   .scaleBand()
  //   .range([0, chartWidth])
  //   .round(true)
  //   .padding(0.1)
  //   .domain(config.data.map((d, i) => {
  //     //if (i > 0){
  //       return d[labelColumn]
  //     }//}
  //     ));

  var floors = config.data.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max(...ceilings);
  //console.log(max)

  chartElement
    .append("rect")
    .attr("x",xScale(new Date(currentTrendDate))+ barWidth/2)
    .attr("y",0)
    .attr("width",chartWidth - (xScale(new Date(currentTrendDate))))
    .attr("height",chartHeight)
    .attr("fill","#F5F5F5")

    chartElement
    .append("text")
    .attr("x",xScale(new Date(currentTrendDate))+2)
    .attr("y",15)
    .attr("class","preliminary_label")
    .text("Preliminary")

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
        return monthDay(new Date(d));
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d/1000000);//fmtComma(d));

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

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxis
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );

  var xLabelPosition = 5;

  //console.log(config.data[0].date)

  chartElement.append('text')
    .classed('chart-label-title', true)
    .attr('x', xScale(new Date(config.data[0].date))-xLabelPosition)
    .attr('y', yScale(max)+4)
    .text('million doses per day')

  var line = d3
    .line()
    //.curve(d3.curveStepBefore)
    .x(d => xScale(new Date(d[labelColumn]))+barWidth/2)
    .y(d => yScale(d.amt))


    // .y(d => 1)

  var maxTooltipWidth = 120;
  var tooltip = containerElement
    .append('div')
    .attr('id', 'tooltip')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('visibility', 'hidden')
    .style('background', '#fff')
    .text('');
  var mainTooltipLabel = tooltip.append('div').attr('class', 'tooltip-label main');
  var secondLabel = tooltip.append('div').attr('class', 'tooltip-label second');


  // Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(new Date(d[labelColumn]))-barWidth/2)
    .attr("y", d => (d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn])))
    .attr("width", barWidth)
    .attr("height", d =>
      d[valueColumn] < 0
        ? yScale(d[valueColumn]) - yScale(0)
        : yScale(0) - yScale(d[valueColumn])
    )
    .attr("class", function(d) {
      return "bar bar-" + d[labelColumn];
    })
    .style("fill",function(d,i){
      //console.log(window.NEW_DATES)
      //console.log(d.date)
      if (i > lineDataLength-prelimData-1){
        //console.log("hello")
        return COLORS.teal6
        // return "url(#pattern)"
      }

      else {
        return '#85bcbb'//COLORS.teal4 + 'B3'

      }
      //

    })
    .on("mouseover",function(d){
      if (isMobile.matches) {
            return;
      }

      var avgData = config.lineData[0].values.filter(r => r.date == d.date)[0]
      //console.log(avgData)
      var tooltipY = yScale(avgData.amt) - 80
      var tooltipX = xScale(new Date(avgData.date)) + 20

      // if (tooltipX > (chartWidth - 150)){
      //   tooltipX = tooltipX - 150
      // }

      if (yearAbbrev(new Date(d.date))=='20'){
        mainTooltipLabel.text(`${monthDay(new Date(d.date))}, 2020`);
      }
      else {
        mainTooltipLabel.text(monthDay(new Date(d.date)));
      }

      var result = compare(new Date(d.date),new Date(currentTrendDate))

      if (result == 1){
        secondLabel.html(`New doses (preliminary): <i>${fmtComma(d.new_administered)}</i>`)
      }
      else {
        secondLabel.html(`New doses: <b>${fmtComma(d.new_administered)}</b>`)
      }


      var bodyPos = document.querySelector("body").getBoundingClientRect();
          //var mapPos = document.querySelector(config.container + " svg").getBoundingClientRect();
          //var offsetX = (bodyPos.width / 2);

          // console.log(bodyPos);

      var barPos = this.getBoundingClientRect();

      tooltip.style('top', tooltipY + 'px');

      tooltip.style('left', tooltipX + 'px');

      return tooltip.style('visibility', 'visible');

    })
    .on("mouseout",function(d){
      if (isMobile.matches) {
            return;
      }
      tooltip.style('visibility', 'hidden');
    });



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

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.lineData)
    .enter()
    .append("path")
    .attr("class", "line")
    .attr("stroke", COLORS.teal1)
    .attr("stroke-width",2)
    .attr("d", d => line(d.values.slice(7).reverse().slice(prelimData).reverse()))
    .attr("fill",'none');

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.lineData)
    .enter()
    .append("path")
    .attr("class", "line")
    .attr("stroke", COLORS.teal1)
    .attr("stroke-width",2)
    .attr("stroke-dasharray","2 4")
    .attr("stroke-linecap","round")
    .attr("d", d => line(d.values.slice(d.values.length-1-prelimData)))
    .attr("fill",'none');



  chartElement
    .append("text")
    .attr("x",xScale(new Date(finalPrelimDate)) + offsetLabel)
    .attr("y",yScale(finalPrelimAmount) + 5)
    .html(`${(finalPrelimAmount/1000000).toFixed(2)} million doses administered per day (7-day avg.)`)
    .attr("fill",COLORS.teal1)
    .attr("font-size",12)
    .attr("font-weight",'bold')
    .call(wrapText,110,14)




  // chartElement
  //   .append("circle")
  //   .attr("x",xScale(new Date(currentTrendDate)) + 5)
  //   .attr("y",yScale(currentTrendAmount)+5)
  //   .attr("radius",4)
  //   //.html(`<b>${(currentTrendAmount/1000000).toFixed(2)} million<b> doses per day`)
  //   .attr("fill","black")


  chartElement
    .append("g")
    .attr("class", "end-circles")
    .append("circle")
    .attr("class", "circle")
    .attr("fill", COLORS.teal1)
    .attr("stroke", "#ffffff")
    .attr("cx",xScale(new Date(finalPrelimDate)))
    .attr("cy",yScale(finalPrelimAmount))
    .attr("r", getRadius());

  // chartElement
  //   .append("line")
  //   .attr("x1",xScale(new Date(currentTrendDate)) + 6)
  //   .attr("y1",yScale(currentTrendAmount)-1)
  //   .attr("x2",xScale(new Date(currentTrendDate)) + offsetLabel - 5)
  //   .attr("y2",yScale(currentTrendAmount)-1)
  //   .attr("stroke",'black')
  //   .call(wrapText,50,14)

function getRadius() {
  if (isMobile.matches) return "3";
  return "4";
}

function compare(a,b) {
        // Compare two dates (could be of any type supported by the convert
        // function above) and returns:
        //  -1 : if a < b
        //   0 : if a = b
        //   1 : if a > b
        // NaN : if a or b is an illegal date
        // NOTE: The code inside isFinite does an assignment (=).
        return (
            isFinite(a=a.valueOf()) &&
            isFinite(b=b.valueOf()) ?
            (a>b)-(a<b) :
            NaN
        );
}
    //.call(wrapText,50,16)

  // Render bar values.
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .text(d => d[valueColumn])
  //   .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
  //   .attr("y", d => yScale(d[valueColumn]))
  //   .attr("dy", function(d) {
  //     var textHeight = this.getBBox().height;
  //     var $this = d3.select(this);
  //     var barHeight = 0;

  //     if (d[valueColumn] < 0) {
  //       barHeight = yScale(d[valueColumn]) - yScale(0);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return -(textHeight - valueGap / 2);
  //       } else {
  //         $this.classed("out", true);
  //         return textHeight + valueGap;
  //       }
  //     } else {
  //       barHeight = yScale(0) - yScale(d[valueColumn]);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return textHeight + valueGap;
  //       } else {
  //         $this.classed("out", true);
  //         return -(textHeight - valueGap / 2);
  //       }
  //     }
  //   })
  //   .attr("text-anchor", "middle");
};
