var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a stacked bar chart.
module.exports = function(config) {
  // Setup
  var { labelColumn, nameColumn } = config;

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 100;
  var labelMargin = 6;
  var valueGap = 6;

  var margins = {
    top: 30,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 100;

  if (isMobile.matches) {
    ticksX = 2;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  // var max = Math.max(...ceilings);
  var max = 66;

  if (min > 0) {
    min = 0;
  }

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data[0].values.map(d => d[nameColumn]))
      .range([COLORS.teal3, "#bbb", COLORS.blue3, "#ccc"]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  legend.append("b").style("background-color", colorScale);

  legend.append("label").text(d => d);

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
    .tickFormat(d => d );

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxis
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

    // Append dotted line for model 15
    chartElement.append("line")
    .attr("class", "model-line")
    .attr("x1", xScale(15))
    .attr("x2", xScale(15))
    .attr("y1", -10)
    .attr("y2", chartHeight)
    .style("stroke-dasharray", ("3, 3"))
    .style("stroke-width", "1.5");

    // Append dotted line for model 30

    chartElement.append("line")
    .attr("class", "model-line")
    .attr("x1", xScale(30))
    .attr("x2", xScale(30))
    .attr("y1", -10)
    .attr("y2", chartHeight)
    .style("stroke-width", "1.5")
    .style("stroke-dasharray", ("3, 3"));

  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group " + classify(d[labelColumn]))
    .attr(
      "transform",
      (d, i) => "translate(0," + i * (barHeight + barGap) + ")"
    );

  group
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", d => colorScale(d[nameColumn]))
    .attr("class", d => classify(d[nameColumn]));

  // Render bar values.
  group
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(d => d.values)
    .enter()
    .append("text")
    .text(d => (d.val ? d.val : null))
    .attr("class", d => classify(d.name))
    .attr("x", d => xScale(d.x1))
    .attr("dx", function(d) {
      var textWidth = this.getComputedTextLength();
      var barWidth = Math.abs(xScale(d.x1) - xScale(d.x0));

      // Hide labels that don't fit
      if (textWidth + valueGap * 2 > barWidth) {
        d3.select(this).classed("hidden", true);
      }

      if (d.x1 < 0) {
        return valueGap;
      }

      return -(valueGap + textWidth);
    })
    .attr("dy", barHeight / 2 + 4);

  // Render 0-line.
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight);
  }

    // Append label for model 15

    chartElement.append("text")
      .attr("class", "model-label")
      .attr("x", xScale(15))
      .attr("y", -17)
      .attr("text-anchor", "middle")
      .text(LABELS.label15)


    // Append label for model 30

    chartElement.append("text")
    .attr("class", "model-label")
    .attr("x", xScale(31))
    .attr("y", -17)
    .attr("text-anchor", "middle")
    .text(LABELS.label30)



  // Render bar labels.
  chartWrapper
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0"
      })
    )
    .selectAll("li")
    .data(config.data)
    .enter()
    .append("li")
    .attr("style", (d, i) =>
      formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px;"
      })
    )
    .attr("class", d => classify(d[labelColumn]))
    .append("span")
    .text(d => d[labelColumn]);


  //table

  allStates = DATA.map(d => d.label);
allStates.unshift("Select a State");

var stateMenu = d3.select('#dropdown');

    stateMenu
      .selectAll("option")
      .data(allStates)
      .enter()
      .append("option")
      .text(d => d)
      .attr("value", d => d);
  
    stateMenu.on("change", function() {
        var section = document.getElementById("dropdown");
        userData = section.options[section.selectedIndex].value;  
        render(userData);
        });
        
  var render = function(userData) {

    var container = "#table-graphic";
    var element = document.querySelector(container);

    // handle user data
 
    var userDataMeasures = [];
    if (userData != "") {
        var matchUserDataRows = DATA.filter(x=>x.label == userData)
        console.log(matchUserDataRows);
    
        for (i in matchUserDataRows) {
          var matchRow = matchUserDataRows[i];
          var d = {};
          d['label'] = matchRow.label;
          d['now'] = matchRow.now;
          d['additional'] = matchRow.additional;
          userDataMeasures.push(d)
    
        }
        renderAutoText(userDataMeasures);
        console.log(userDataMeasures)

      //Dropdown

      // Update iframe
      if (pymChild) {
        pymChild.sendHeight();
      }

};
}

var renderAutoText = function(userDataMeasures) {
  
   d3.select(".auto-text").html('');
  
    if (stateName != "Select a State") {

      d3.select(".auto-text").append("div")
        .attr("class", "auto-table-hrr");
  
      d3.select(".auto-table-hrr").append("tr")
        .attr("class", "auto-table-hed")
        .html(`
          <td>State</td>
          <td class="amt">Now</td>
          <td class="amt">Additional</td>
        `);
    
      for (i in userDataMeasures) {
        var stateName = userDataMeasures[i]

        d3.select(".auto-table-hrr").append("tr")
          .html(`
            <td>${stateName.label}</td>
            <td class="amt">${stateName.now}</td>
            <td class="amt">${stateName.additional}</td>
          `);
        
      }

    }
      
}



};
