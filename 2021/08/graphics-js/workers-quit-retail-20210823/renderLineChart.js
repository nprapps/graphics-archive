var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
};

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

var recession_dates = [
  { begin: new Date(2020, 1, 1), end: new Date(2020, 3, 1) },
];

// Render a line chart.
module.exports = function (config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 10,
    right: 100,
    bottom: 20,
    left: 30,
  };

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = 1;

  // Mobile
  if (isMobile.matches) {
    ticksY = 5;
    margins.right = 40;
  }

  // Calculate actual chart dimensions
  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function (d) {
        return d.name;
      })
    )
    .range(["#777", COLORS.teal3, COLORS.teal3, COLORS.teal3, COLORS.teal3]);
  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  if (isMobile.matches) {


  var legendData = ['Overall']
  var legend = containerElement
    .append("ul")
    .attr("class", "key" + oneLine)
    .selectAll("g")
    .data(legendData)
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d));

  legend.append("b").style("background-color", d => d == "Overall" ?  '#777' : COLORS.teal3);

  legend
    .append("label")
    .text(
      d => d + " quit rate"
    );
 }
  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  // if (!isMobile.matches) {
  //   var chartWrapper = containerElement
  //     .append("div")
  //     .attr("class", "grid-wrapper backdrop");

  //     chartWrapper
  //     .append("h3")
  //     .html(' ');

  //   var height =
  //     Math.ceil((config.width * aspectHeight) / aspectWidth) -
  //     margins.top -
  //     margins.bottom;

  //   var yScale = d3.scaleLinear().domain([0, 6]).range([height, 0]);

  //   var chartElement = chartWrapper
  //     .append("svg")
  //     .attr("width", config.width)
  //     .attr("height", height)
  //     .append("g")
  //     .attr("transform", `translate(${margins.left},${-margins.bottom})`);

  //   var yAxis = d3
  //     .axisLeft()
  //     .scale(yScale)
  //     .ticks(6)
  //     .tickFormat(d => (d == 0 ? d : d + "%"));

  //   var yAxisGrid = function () {
  //     return yAxis;
  //   };

  //   chartElement
  //     .append("g")
  //     .attr("class", "y grid")
  //     .call(yAxisGrid().tickSize(-(config.width - margins.left - margins.right), 0, 0).tickFormat(""));

  // }

  var footnote = 1;

  config.data.forEach(function (chart, index) {
    // margins.left = 0;
    margins.left = 30;
    if (chart.name == "Overall") return;
    var chartWidth =
      config.width / (1) - margins.left - margins.right;
    var chartHeight =
      Math.ceil((config.width * aspectHeight) / aspectWidth) -
      margins.top -
      margins.bottom;

    var xScale = d3.scaleTime().domain(extent).range([0, chartWidth]);

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

    var yScale = d3.scaleLinear().domain([min, max]).range([chartHeight, 0]);

    // Create the root SVG element.

    var chartWrapper = containerElement
      .append("div")
      .attr("class", "graphic-wrapper");
    // chartWrapper.append("h3").html(function() {
    //   var prefix = "";
    //   // if (index != 2) {
    //   //   prefix = `<sup>${footnote}</sup>`;
    //   //   footnote +=1;
    //   // }
    //   return chart.name + prefix;
    // });

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
      .tickFormat(function (d, i) {
        if (isMobile.matches) {
          return "\u2019" + yearAbbrev(d);
        } else {
          return yearFull(d);
        }
      });

    var yAxis = d3
      .axisLeft()
      .scale(yScale)
      .ticks(ticksY)
      .tickFormat(function (d) {
        return d == 0 ? d : d + "%";
      });

    var recession = chartElement
      .append("g")
      .attr("class", "recession")
      .selectAll("rect")
      .data(recession_dates)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d.begin))
      .attr("width", d => xScale(d.end) - xScale(d.begin))
      .attr("y", 0)
      .attr("height", chartHeight)
      .attr("fill", "#ebebeb");

    // Render axes to chart.

    chartElement
      .append("g")
      .attr("class", "x axis")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxis);

    //if (isMobile.matches || index == 1 || index == 3)
    chartElement.append("g").attr("class", "y axis").call(yAxis);

    // Render grid to chart.

    var xAxisGrid = function () {
      return xAxis;
    };

    var yAxisGrid = function () {
      return yAxis;
    };

    chartElement
      .append("g")
      .attr("class", "x grid")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxisGrid().tickSize(-chartHeight, 0, 0).tickFormat(""));

    var offsetAmt = 0; //(index == 1 || index == 3) ? 40 : 0;
    // if (isMobile.matches) {
    chartElement
      .append("g")
      .attr("class", "y grid")
      // .attr("transform",(index == 1 || index == 3) ? makeTranslate(40, 0) : makeTranslate(0, 0))
      .call(
        yAxisGrid()
          .tickSize(-chartWidth - offsetAmt, 0)
          .tickFormat("")
      );
    // }

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
      .curve(d3.curveCatmullRom.alpha(0.15))
      .x(d => xScale(d[dateColumn]))
      .y(d => yScale(d[valueColumn]));

    chartElement
      .append("g")
      .attr("class", "lines")
      .selectAll("path")
      .data(config.data.filter(d => ["Overall", chart.name].includes(d.name)))
      .enter()
      .append("path")
      .attr("class", d => "line " + classify(d.name))
      .attr("stroke", d => colorScale(d.name))
      .attr("d", d => line(d.values));

    var lastItem = d => d.values[d.values.length - 1];

    chartElement
      .append("g")
      .append("text")
      .attr("x", xScale(new Date(2020, 2, 1)))
      .attr("y", index == 1 ? yScale(0.5) : yScale(5.5))
      .attr("class", "recession-label")
      .attr("text-anchor", "middle")
      .text("Recession");

    chartElement
      .append("g")
      .attr("class", "value")
      .selectAll("text")
      .data(config.data.filter(d => ["Overall", chart.name].includes(d.name)))
      .enter()
      .append("text")
      .attr("x", function (d) {
        // if (d.name == "Accomodation and Food Service")
        //   return xScale(lastItem(d)[dateColumn]) - 250;

        return xScale(lastItem(d)[dateColumn]) + 5;
      })
      .attr("y", function (d) {
        if (d.name == "Retail store jobs")
          return yScale(lastItem(d)[valueColumn]) - 20;
        // if (d.name == "Professional and business services") return yScale(lastItem(d)[valueColumn]) -7;
        return yScale(lastItem(d)[valueColumn]) + 3;
      })
      .attr("fill", d => colorScale(d.name))
      .attr("text-anchor", d => (d.name == "Retail store jobs") ? "end" : "start")
      .text(function (d) {
        console.log(d)
        var item = lastItem(d);
        var value = item[valueColumn];
        var label = value.toFixed(1) + "%";

        if (d.name == "Retail store jobs") return label + ' of workers in retail store jobs quit their job in June 2021';
        if (d.name == "Overall" && !isMobile.matches) return 'Overall: ' +  label;
        return label;
      }).call(wrapText, 250, 12);

    chartElement
      .append("g")
      .attr("class", "anno-dots")
      .selectAll("circle")
      .data([chart])
      .enter()
      .append("circle")
      .attr("cx", function (d) {
        return xScale(lastItem(d)[dateColumn]);
      })
      .attr("cy", function (d) {
        return yScale(lastItem(d)[valueColumn]);
      })
      .attr("fill", d => colorScale(d.name))
      .attr("r", 3);
  });
};
