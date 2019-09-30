console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var {
  COLORS,
  classify,
  makeTranslate,
  getParameterByName,
  wrapText,
  fmtComma
} = require("./lib/helpers");
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

  window.addEventListener("resize", render);
  render();

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
  // get the combinations we have data for

  var combos = [];

  var demos = { sex: [], age: [], race: [] };

  for (key in demos) {
    d3.selectAll("#" + key + "-menu option").each(function() {
      demos[key].push(d3.select(this).node().value);
    });
  }

  demos["sex"].forEach(function(sex, ind) {
    demos["age"].forEach(function(age, ind) {
      demos["race"].forEach(function(race, ind) {
        combos.push(sex + "-" + age + "-" + race);
      });
    });
  });

  DATA.forEach(function(d) {
    var [m, day, y] = d.date.split("/").map(Number);
    if (y < 1900) {
      y = y > 50 ? 1900 + y : 2000 + y;
    }
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.

  for (var column in DATA[0]) {
    var columnName = column;
    if (column == "all-16_and_older_years-all") {
      columnName = "all-all-all";
    }
    if (column == "date") continue;
    if (combos.indexOf(column) == -1) {
      continue;
    }

    dataSeries.push({
      name: columnName,
      values: DATA.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  multiChartBoolean = getParameterByName("multichart");

  if (multiChartBoolean == "true") {
    multiChartBoolean = true;
  } else {
    multiChartBoolean = false;
  }

  var highlightStart = "all-all-all";
  var startLabel = "";

  if (!multiChartBoolean) {
    renderLineChart({
      container,
      width,
      data: dataSeries,
      multiChartBoolean,
      highlightStart,
      startLabel
    });
  } else {
    highlightStart = "all-16_and_older_years-white";
    startLabel = "White";
    renderLineChart({
      container,
      width,
      data: dataSeries,
      multiChartBoolean,
      highlightStart,
      startLabel
    });
    highlightStart = "all-16_and_older_years-black";
    startLabel = "Black";
    container2 = container + "-2";
    renderLineChart({
      container: container2,
      width,
      data: dataSeries,
      multiChartBoolean,
      highlightStart,
      startLabel
    });
    highlightStart = "all-16_and_older_years-hispanic";
    startLabel = "Hispanic";
    container3 = container + "-3";
    renderLineChart({
      container: container3,
      width,
      data: dataSeries,
      multiChartBoolean,
      highlightStart,
      startLabel
    });
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  if (multiChartBoolean) {
    d3.select("body").classed("multichart", true);
    d3.select("body").classed("interactivechart", false);
  } else {
    d3.select("body").classed("multichart", false);
    d3.select("body").classed("interactivechart", true);
  }

  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 15,
    bottom: 20,
    left: 44
  };

  var ticksX = 10;
  var ticksY = 4;
  var roundTicksFactor = 5;

  if (multiChartBoolean) {
    ticksY = 6;
  }

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 25;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  if (chartHeight > 450) {
    chartHeight = 450;
  }

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
  min = 500;

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = 1250;

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

  // put in the header label if multichart

  if (config.multiChartBoolean) {
    containerElement
      .append("div")
      .attr("class", "chart-label")
      .html(config.startLabel);
  }

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
      if (multiChartBoolean) {
        if (i % 2 == 0) {
          return "'" + fmtYearAbbrev(d);
        } else {
          return "";
        }
      }
      return fmtYearFull(d);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i) {
      return "$" + fmtComma(d);
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

  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  var badDataVal = 100;

  // Render lines to chart.
  var line = d3
    .line()
    .defined(d => (d[valueColumn] == badDataVal ? false : true))
    .x(d => xScale(d[dateColumn]))
    .y(function(d) {
      return yScale(d[valueColumn]);
    });

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
      this.parentNode.appendChild(this);
    });
  };

  // make interactivity

  function addNatlLabel() {
    var natlAverageNumber = 770;

    chartElement
      .append("text")
      .attr("x", 5)
      .attr("y", yScale(natlAverageNumber))
      .attr("class", "natl-average-label-stroke natl-average-label-part")
      .text("NATL. AVERAGE");

    var natlLabel = chartElement
      .append("text")
      .attr("x", 5)
      .attr("y", yScale(natlAverageNumber))
      .attr("class", "natl-average-label natl-average-label-part")
      .text("NATL. AVERAGE");
  }

  var cleanLabel = function(comboStr) {
    var comboSplit = comboStr.split("-");
    cleanStr = comboSplit[2] + " " + comboSplit[0];
    // cleanStr = cleanStr.split("all").join("");
    cleanStr = cleanStr.split("_").join(" ");
    cleanStr = cleanStr.toUpperCase();
    cleanStr = cleanStr.replace("OR AFRICAN AMERICAN", "");
    cleanStr = cleanStr.replace(" YEARS", "");
    cleanStr = cleanStr.replace("ALL ALL", "");
    cleanStr = cleanStr.replace(" ALL", "");
    return cleanStr.toUpperCase();
  };

  var highlightLine = function(selector, data, method) {
    if (method == "dropdown" || method == "param") {
      d3.selectAll(".active").classed("active", false);
    }

    if (method != "param") {
      d3.selectAll(".natl-average-label-part").remove();
    }

    var avgSelected = d3.select(selector).classed("all-all-all");

    d3.selectAll(".active-hover")
      .classed("active-hover", false)
      .classed("active", false);

    d3.select(".all-all-all.line").moveToFront();

    if (!avgSelected) {
      d3.select(".all-all-all.line").style("stroke", COLORS.teal5);
    } else {
      addNatlLabel();
      d3.select(".all-all-all.line").style("opacity", 1);
    }

    d3.select(selector).moveToFront();

    if (method == "dropdown" || method == "param") {
      d3.select(selector).classed("active", true);
    }

    if (method == "hover") {
      if (d3.select(selector).classed("active") == false) {
        d3.select(selector).classed("active-hover", true);
      }
    }

    d3.selectAll(".active-label-hover").remove();
    d3.selectAll(".active").moveToFront();

    if (method == "dropdown" || method == "param") {
      d3.selectAll(".active-label").remove();
    }

    ["active-label active-label-stroke", "active-label"].forEach(function(
      el,
      ind
    ) {
      var thisClass = el;

      if (method == "hover") {
        var thisClassArr = thisClass.split(" ");
        var newClass = "";
        for (i in thisClassArr) {
          newClass =
            newClass + thisClassArr[i] + " " + thisClassArr[i] + "-hover ";
        }
        thisClass = newClass;
      }

      chartElement
        .append("text")
        .attr("x", 5)
        .attr("y", yScale(data.values[0].amt) - 9)
        .attr("class", thisClass)
        .text(cleanLabel(data.name));
      // .call(wrapText, 250,12);
    });
  };

  // highlight natl avg

  chartElement
    .select("." + config.highlightStart + ".line")
    .classed("active", true)
    .moveToFront();

  if (!multiChartBoolean) {
    d3.selectAll(".line").on("mouseover", function(el) {
      d3.select(".all-all-all.line").moveToFront();
      highlightLine(this, el, "hover");
    });
  }

  d3.selectAll(".change-menu").on("change", function() {
    var selectedData = [];
    var demos = ["sex", "age", "race"];
    demos.forEach(function(el, ind) {
      selectedData.push(d3.select("#" + el + "-menu").node().value);
    });

    var comboStr = selectedData.join("-");

    d3.select(".all-all-all.line").moveToFront();
    comboStrSelector = selectedData.join("-");
    if (comboStrSelector == "all-16_and_older_years-all")
      comboStrSelector = "all-all-all";

    highlightLine(
      "." + comboStrSelector,
      config.data.filter(a => a.name == comboStr)[0],
      "dropdown"
    );
  });

  if (!multiChartBoolean) {
    addNatlLabel();
  }

  // allow for parameters

  var areParams = false;

  var variables = ["sex", "age", "race"];

  var params = {};

  variables.forEach(function(el, ind) {
    params[el] = getParameterByName(el);
    if (params[el] == "") {
      params[el] = "all";
      if (el == "age") {
        params[el] = "16_and_older_years";
      }
    } else {
      areParams = true;
    }
  });

  console.log(params);

  if (areParams) {
    var comboStr = params["sex"] + "-" + params["age"] + "-" + params["race"];

    var comboStrSelector = comboStr.replace("-all-", "-16_and_older_years-");

    highlightLine(
      "." + comboStrSelector,
      config.data.filter(a => a.name == comboStr)[0],
      "param"
    );
  }

  if (multiChartBoolean) {
    d3.selectAll("select").remove();
    chartElement.selectAll(".line").classed("hidden", function() {
      var thisClass = d3.select(this).attr("class");
      var thisRace = config.highlightStart.split("-")[2].toLowerCase();
      if (thisClass.indexOf(thisRace) > -1) {
        return false;
      } else {
        return true;
      }
    });

    // add in men/women labels on multichart

    var menLineSelector = config.highlightStart.replace("all-", "men-");
    var womenLineSelector = config.highlightStart.replace("all-", "women-");

    chartElement.select("." + menLineSelector).classed("men-line", true);
    chartElement.select("." + womenLineSelector).classed("women-line", true);

    var menLineData, womenLineData;

    for (i in config.data) {
      if (config.data[i].name == menLineSelector) {
        menLineData = config.data[i].values;
      }
      if (config.data[i].name == womenLineSelector) {
        womenLineData = config.data[i].values;
      }
    }

    var spacer = 33;

    if (!isMobile.matches) {
      spacer = 16;
    }

    chartElement
      .append("text")
      .attr("class", "gender-label men-chart-label")
      .attr("x", 2)
      .attr("y", function() {
        // if (menLineData[0].amt > womenLineData[0].amt) {
        //   spacer = spacer * -1
        // }
        return yScale(menLineData[0].amt) - spacer;
      })
      .text("Men");

    // spacer = 12

    chartElement
      .append("text")
      .attr("class", "gender-label women-chart-label")
      .attr("x", 2)
      .attr("y", function() {
        spacer = 12;
        // if (menLineData[0].amt > womenLineData[0].amt) {
        //   spacer = spacer * -1
        // }
        return yScale(womenLineData[0].amt) + spacer;
      })
      .text("Women");
  }

  // d3.select("h2#subhed").html(function(){
  //   if (multiChartBoolean) {
  //     return LABELS.subhed
  //   }
  //   else {
  //     return LABELS.int_subhed
  //   }
  // })

  // d3.select("h1#hed").html(function(){
  //   if (multiChartBoolean) {
  //     return LABELS.headline
  //   }
  //   else {
  //     return LABELS.int_headline
  //   }
  // })
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
