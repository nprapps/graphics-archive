console.clear();

// Global vars
// old data url
// var DATA_URL = 'https://elections.npr.org/data/delegates.json';
// new data url
var DATA_URL = "https://apps.npr.org/elections20-primaries/data/delegates.json";
var JUMBO_THRESHOLD = 800;
var MAX_WIDTH = 1300;
var pymChild = null;
var delegateData = [];
var overallData = [];
var groupedData = [];
var otherData = [];
var stateData = [];
var parties = ["Dem"];
var states = null;
var isJumbo = false;
var isMobile = false;
var inactiveColorScale = ["#787878", "#aaa", "#f1f1f1"];
var candidateList = CANDIDATES.map(d => d.name);
var candidateListGrouped = CANDIDATES_GROUPED.map(d => d.name);

// Global config
var DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

var pym = require("./lib/pym");
var Retriever = require("./lib/retriever");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var {
  classify,
  COLORS,
  makeTranslate,
  fmtComma,
  formatStyle,
  getAPMonth
} = require("./lib/helpers");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-fetch/dist/d3-fetch.min"),
  ...require("d3-collection/dist/d3-collection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var pymChild = null;

/*
 * Initialize the graphic.
 */

pym.then(function(child) {
  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", render);

  // child.onMessage("on-screen", function(bucket) {
  //   ANALYTICS.trackEvent("on-screen", bucket);
  // });
  // child.onMessage("scroll-depth", function(data) {
  //   data = JSON.parse(data);
  //   ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  // });
});

var onData = function(newData) {
  loadData(newData);
  render();
};

var retriever = new Retriever(onData);

var onWindowLoaded = function() {
  retriever.watch(DATA_URL, 60);
};

var getTotalVotes = function(lastName) {
  var matchingCand = overallData.parties.Dem.candidates.filter(
    x => x.name == lastName
  );
  return matchingCand.length > 0 ? matchingCand[0].total : 0;
};

var compareDates = function(a, b) {
  if (a > b) {
    return a;
  }
  return b;
};

var apMonthsList = [
  "Jan.",
  "Feb.",
  "March",
  "April",
  "May",
  "June",
  "July",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec."
];

var getDateObjects = function(date) {
  var dateObj = new Date(date);

  var day = dateObj.getDate();
  var month = apMonthsList[dateObj.getMonth()];
  var year = dateObj.getFullYear();
  var hours = dateObj.getHours();
  var minutes = dateObj.getMinutes();
  var seconds = dateObj.getSeconds();

  return {
    day: day,
    month: month,
    year: year,
    hours: hours,
    minutes: minutes,
    seconds: seconds
  };
};

var makeLongAP = function(dateInput) {
  var obj = getDateObjects(dateInput);
  var day = obj.day;
  var month = obj.month;
  var year = obj.year;
  var hours = obj.hours;
  var minutes = obj.minutes;
  var ampm = "p.m.";
  if (hours < 12) {
    ampm = "a.m.";
  } else hours = hours % 12;
  if (hours == 0) {
    hours = "12";
  }
  if (minutes.toString().length == 1) {
    minutes = "0" + minutes;
  }
  return (
    month +
    " " +
    day +
    ", " +
    year +
    " at " +
    hours +
    ":" +
    minutes +
    " " +
    ampm +
    " ET"
  );
};

/*
 * Load data from a JSON
 */
var loadData = function(data) {
  overallData = data.sum;
  overallData.parties.Dem.candidates = overallData.parties.Dem.candidates.filter(
    x => candidateList.indexOf(x.name) > -1
  );

  stateData = data.state;
  stateData.parties.Dem.states = stateData.parties.Dem.states.filter(
    x => x.state != "UN"
  );
  states = stateData.parties.Dem.states;

  // filtering out everyone but biden and sanders and combining everyone else's totals into a new object
  var filterIn = ["1036", "1445"];
  var otherTotal = 0;
  groupedData = overallData.parties.Dem.candidates.filter(x =>
    filterIn.includes(x.id)
  );
  otherData = overallData.parties.Dem.candidates.filter(
    x => !filterIn.includes(x.id)
  );
  for (var i = 0; i < otherData.length; i++) {
    otherTotal += otherData[i].total;
  }

  groupedData.push({
    name: "Other",
    id: "1111",
    total: otherTotal
  });

  zeroCandidates = candidateList.filter(x => getTotalVotes(x) == 0);

  candidateList = candidateList.filter(x => getTotalVotes(x) > 0);

  // update timestamp

  var newDate = compareDates(data.sum.updated, data.state.updated);
  // convert to ET
  newDate = parseInt(newDate);

  d3.select(".updated-hed").html("Updated " + makeLongAP(newDate));

  window.data = data;
};

var render = function() {
  // if data is not yet acquired (render being triggered by resize)
  if (!window.data) return;

  formatData(data);

  if (HTMLFILE == "cand-table") {
    renderTable({
      container: ".detail.dem",
      data: stateData,
      party: "dem"
    });
  } else {
    var graphicWidth = d3
      .select(".chart.dem")
      .node()
      .getBoundingClientRect().width;

    renderGraphic(graphicWidth);
  }

  lastUpdated = data["last_updated"];
  var source = d3.select(".footer .as-of");
  var sourceText = " (as of " + lastUpdated + " EDT)";
  source.text(sourceText);

  // pymChild.onMessage('on-screen', function(bucket) {
  //     ANALYTICS.trackEvent('on-screen', bucket);
  // });
  // pymChild.onMessage('scroll-depth', function(data) {
  //     ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
  // });

  //remove fallback
  var containerSelector = ".graphic";
  var container = d3.select(containerSelector);

  // remove candidates who have no delegates

  for (cI in zeroCandidates) {
    d3.selectAll("." + classify(zeroCandidates[cI])).classed("hidden", true);
  }
};

// set up functions

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
  // Loop through overall totals (nested as party, then candidate)
  parties.forEach(function(p, i) {
    function compareDelCount(a, b) {
      if (a.delegates_count < b.delegates_count) return 1;
      if (b.delegates_count < a.delegates_count) return -1;

      return 0;
    }

    overallData.parties[p].candidates.sort(compareDelCount);
  });
};

/*
 * Detailed delegate data table
 */
var renderTable = function(config) {
  var party = config["party"];

  var stateList = DEM_DATES;

  stateList = stateList.map(d => d.usps);

  var dataTable = d3.select(config["container"] + " table");
  var dataRows = dataTable.select("tbody").selectAll("tr");

  for (i = 0; i < states.length; i++) {
    var d = states[i].state;
    var skipStates = ["nation", "US", "last_updated", "UN"];
    if (skipStates.indexOf(d) > -1) continue;

    var row = dataTable.select("tr." + d);
    var sData = config["data"].parties.Dem.states.filter(x => x.state == d)[0];
    var sDataCands = sData.candidates.filter(
      x => candidateList.indexOf(x.name) > -1
    );
    var stotal = row.select("td.total");
    var sDels = DEM_DATES.filter(x => x.usps == d)[0].pledged_dels;

    sDataCands.forEach(function(v, k) {
      var cDels = Number(v.total);
      var cDelsFloor = Math.floor(cDels / 10) * 10;

      var cCell = row.selectAll("td." + classify(v.name)).html(cDels);

      if (cDels > 0) {
        cCell.classed("has-dels", true);
        cCell.classed("bg-" + cDelsFloor, true);
      }

      sDels -= cDels;
    });

    stotal.text(DEM_DATES.filter(x => x.usps == d)[0].pledged_dels);

    row.select("td.unassigned").text(sDels);
    // if (sDels > 0) {
    //     stotal.classed('has-dels', true);
    // }
  }
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var renderGraphic = function(containerWidth) {
  if (!containerWidth) {
    containerWidth = DEFAULT_WIDTH;
  }

  var barChartWidth = containerWidth;
  if (barChartWidth > MAX_WIDTH) {
    barChartWidth = MAX_WIDTH;
  }

  var gutterWidth = 33;

  if (containerWidth <= MOBILE_THRESHOLD) {
    isMobile = true;
    isJumbo = false;
  } else if (containerWidth >= JUMBO_THRESHOLD) {
    isMobile = false;
    isJumbo = true;
  } else {
    isMobile = false;
    isJumbo = false;
  }

  // Clear existing graphic (for redraw)
  parties.forEach(function(p, i) {
    // Render the chart!

    if (HTMLFILE == "step-chart") {
      renderStepChart({
        container: ".step-chart." + p.toLowerCase() + " .wrapper",
        width: barChartWidth,
        data: groupedData,
        party: p
      });
    }

    if (HTMLFILE == "stacked-bars") {
      renderStackedBarChart({
        container: ".chart." + p.toLowerCase() + " .wrapper",
        width: barChartWidth,
        data: groupedData,
        party: p,
        delsRequired: 1991
      });
    }

    // Update iframe
    if (pymChild) {
      pymChild.sendHeight();
    }
  });
};

/*
 * Render a step line chart.
 */
var renderStepChart = function(config) {
  // format the data in a way that step chart can read

  var dataSeries = [];
  var filterOther = ["62244", "32324", "67933", "51526", "62589"];

  var stateDemData = stateData.parties.Dem.states;

  // this function is maybe broken...in firefox...
  function sortStateDate(a, b) {
    var amatchingStateData = DEM_DATES.filter(x => x.usps === a.state)[0];
    var athisDate = new Date(
      amatchingStateData.date.replace(".", "") + ", 2020"
    );

    var bmatchingStateData = DEM_DATES.filter(x => x.usps === b.state)[0];
    var bthisDate = new Date(
      bmatchingStateData.date.replace(".", "") + ", 2020"
    );

    if (athisDate > bthisDate) {
      return 1;
    }
    if (bthisDate > athisDate) {
      return -1;
    }

    return 0;
  }

  stateDemData.sort(sortStateDate);

  // Restructure tabular data for easier charting.
  for (var cI in candidateListGrouped) {
    var thisCand = candidateListGrouped[cI];

    var d = {};
    d.name = thisCand;
    d.values = [];

    var runningTotal = 0;

    if (thisCand == "Other") {
      for (sI in stateDemData) {
        var matchingStateData = DEM_DATES.filter(
          x => x.usps == stateDemData[sI].state
        )[0];
        var [m, day, y] = [
          matchingStateData.month,
          matchingStateData.day,
          2020
        ];
        var thisDate = new Date(y, m - 1, day);

        for (var i = 0; i < stateDemData[sI].candidates.length; i++) {
          if (filterOther.indexOf(stateDemData[sI].candidates[i].id) > -1) {
            runningTotal += stateDemData[sI].candidates[i].total;
          }
        }

        if (matchingStateData.month) {
          d.values.push({ date: thisDate, amt: runningTotal });
        }
      }
    } else {
      for (sI in stateDemData) {
        // get only this candidates results
        var thisCandResult = stateDemData[sI].candidates.filter(
          x => x.name == thisCand
        )[0];

        var matchingStateData = DEM_DATES.filter(
          x => x.usps == stateDemData[sI].state
        )[0];
        var [m, day, y] = [
          matchingStateData.month,
          matchingStateData.day,
          2020
        ];
        var thisDate = new Date(y, m - 1, day);

        runningTotal = runningTotal + thisCandResult.total;

        if (matchingStateData.month) {
          d.values.push({ date: thisDate, amt: runningTotal });
        }
      }
    }

    dataSeries.push(d);
  }

  console.log(dataSeries);

  // Render the graphic(s). Called by pym with the container width.
  var container = config.container;
  var element = document.querySelector(container);
  var width = config.width;
  renderLineChart({
    container,
    width,
    data: dataSeries
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
  /*
   * Setup
   */
  var labelColumn = "name";

  var barHeight = 50;
  var barGap = 2;
  var labelWidth = 130;
  var labelMargin = 11;
  var valueGap = 6;
  var ticksX = 4;
  var delsRequired = config["delsRequired"];


  if (isMobile) {
    barHeight = 40;
    labelWidth = 100;
    ticksX = 2;
  }

  var rightMargin = Math.floor(config["width"] * 0.3);
  var cols = 2;

  var valueWidth = Math.floor(rightMargin / cols);

  var margins = {
    top: 0,
    right: rightMargin + barGap,
    bottom: 25,
    left: labelWidth + labelMargin
  };

  // Calculate actual chart dimensions
  var chartWidth = config["width"] - margins["left"] - margins["right"];
  var chartHeight = (barHeight + barGap) * candidateListGrouped.length;

  // Cache reference to container element
  var containerElement = d3.select(config["container"]);
  containerElement.html("");

  /*
   * Create D3 scale objects.
   */
  var min = 0;
  var max = d3.max(config["data"], function(d) {
    return d["total"];
  });
  if (max < delsRequired && max >= 1000) {
    max = delsRequired;
  }
  if (max < 25) {
    max = 25;
  } else if (max < 1000) {
    max = 1000;
  }

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(["Pledged delegates"])
    .range([COLORS["trueblue"], COLORS["blue4"], "#f1f1f1"]);

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins["left"] + margins["right"])
    .attr("height", chartHeight + margins["top"] + margins["bottom"])
    .append("g")
    .attr(
      "transform",
      "translate(" + margins["left"] + "," + margins["top"] + ")"
    );

  // define filters
  var grayFilter = chartElement.append("filter").attr("id", "grayscale");
  grayFilter
    .append("feColorMatrix")
    .attr("type", "matrix")
    .attr(
      "values",
      "1   0   0   0   0   1   0   0   0   0   1   0   0   0   0   0   0   0   1   0"
    );

  /*
   * Create D3 axes.
   */
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    // .tickValues([ xScale.domain()[0], delsRequired ])
    .tickValues([xScale.domain()[0], max])
    .tickFormat(function(d, i) {
      if (i == 1) {
        // return 'Needed: ' + fmtComma(d);
        return fmtComma(d);
      } else {
        return fmtComma(d);
      }
    });
  /*
   * Create D3 scale objects.
   */
  var min = 0;
  var max = d3.max(config["data"], function(d) {
    return d["total"];
  });
  if (max < delsRequired && max >= 1991) {
    max = delsRequired;
  }
  if (max < 25) {
    max = 25;
  } else if (max < 1991) {
    max = 1991;
  }

  /*
   * Render axes to chart.
   */
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // right-align instead of center-align the last one
  chartElement
    .selectAll(".tick text")
    .style("text-anchor", function(d, i) {
      if (i == 0) {
        return "begin";
      }
      if (i == 1) {
        return "end";
      }
    })
    .attr("dx", function(d, i) {
      if (i == 0) {
        return 2;
      }
      if (i == 1) {
        return 1;
      }
    });

  var calcRemaining = ["Biden", "Sanders"];

  for (cI in groupedData) {
    // var matchingCand = groupedData.filter(x=>x.name == groupedData[cI].name)[0];
    matchingCand = groupedData[cI];
    matchingCand["pctNeeded"] =
      (delsRequired - matchingCand.total) / remainingDels;
    matchingCand["pctNeeded"] =
      (matchingCand["pctNeeded"] * 100).toFixed(1) + "%";
  }

  /*
   * Pull out key numbers
   */
  var keyNums = chartWrapper
    .append("div")
    .attr("class", "key-numbers")
    .attr("style", function() {
      var s = "";
      s += "height: " + (chartHeight + margins["bottom"]) + "px;";
      s += "width: " + (margins["right"] - barGap) + "px;";
      s += "left: " + (margins["left"] + chartWidth + barGap) + "px;";
      s += "top: " + margins["top"] + "px;";
      return s;
    });

  // headers
  keyNums
    .append("h5")
    .attr("style", function() {
      var s = "";
      s += "width: " + valueWidth + "px; ";
      s += "bottom: " + (chartHeight + margins["bottom"] + 10) + "px; ";
      s += "left: 0px;";
      return s;
    })
    .attr("class", "total")
    .text("Total");

  keyNums
    .append("h5")
    .attr("style", function() {
      var s = "";
      s += "width: " + valueWidth + "px; ";
      s += "bottom: " + (chartHeight + margins["bottom"] + 10) + "px; ";
      s += "left: " + valueWidth * (cols - 1) + "px;";
      return s;
    })
    .html("Last 7 days");

  var positiveCandidates = [];

  /*
   * Render grid to chart.
   */
  var xAxisGrid = function() {
    return xAxis;
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

  /*
   * Render bars to chart.
   */
  var group = chartElement
    .append("g")
    .attr("class", function(d) {
      return "group "; // + classify(d[labelColumn]);
    })
    .attr("transform", function(d, i) {
      return "translate(0," + i * (barHeight + barGap) + ")";
    });

  var candidateData = config["data"].filter(
    d => candidateListGrouped.indexOf(d.name) > -1
  );
  var candidateDataNoOther = candidateData.slice(0, 2);

  var remainingDels = 3979;

  for (cI in candidateData) {
    remainingDels = remainingDels - candidateData[cI].total;
  }

  var calcRemaining = ["Biden", "Sanders"];

  for (cI in groupedData) {
    // var matchingCand = groupedData.filter(x=>x.name == groupedData[cI].name)[0];
    matchingCand = groupedData[cI];
    matchingCand["pctNeeded"] =
      (delsRequired - matchingCand.total) / remainingDels;
    matchingCand["pctNeeded"] =
      (matchingCand["pctNeeded"] * 100).toFixed(1) + "%";
  }

  // gray bars
  group
    .append("g")
    .attr("class", "gray-bars")
    .selectAll("rect")
    .data(candidateData)
    .enter()
    .append("rect")
    .attr("fill", "#f1f1f1")
    .attr("x", 0)
    .attr("y", function(d, i) {
      return (chartHeight / candidateListGrouped.length) * i;
    })
    .attr("width", chartWidth)
    .attr("height", barHeight);

  // full blue bars
  group
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(candidateData)
    .enter()
    .append("rect")
    .attr("x", function(d) {
      return xScale(0);
    })
    .attr("y", function(d, i) {
      return (chartHeight / candidateListGrouped.length) * i;
    })
    .attr("width", function(d) {
      return Math.abs(xScale(d["total"]) - xScale(0));
    })
    .attr("height", barHeight)
    .style("fill", COLORS.blue2)
    .attr("class", function(d) {
      var dropout = CANDIDATES_GROUPED.filter(x => x.name == d.name)[0]
        .dropoutdate
        ? "dropout"
        : "no-dropout";
      return classify(d["name"]) + " " + dropout;
    });

  var getRecentDels = function(candName) {
    // get states data
    var statesData = data.state.parties.Dem.states;
    // filter to just states in the last week
    var recentStateCheck = function(stateAbbrv) {
      var matchingStateData = DEM_DATES.filter(x => x.usps == stateAbbrv)[0];
      var stateDate = new Date(
        matchingStateData.month + "/" + matchingStateData.day + "/2020"
      );
      var dateDiff = new Date() - stateDate;
      dateDiff = Math.floor(dateDiff / (1000 * 3600 * 24));
      if (dateDiff <= 7 && dateDiff >= 0) {
        return true;
      }
      return false;
    };

    var recentStates = statesData.filter(x => recentStateCheck(x.state));

    // total up delegates for the candidate
    var candDels = 0;
    for (stateI in recentStates) {
      candDels += recentStates[stateI].candidates.filter(
        x => x.name == [candName]
      )[0].total;
    }

    // return total delegates
    return candDels;
  };

  // highlight last seven days

  group
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(candidateDataNoOther)
    .enter()
    .append("rect")
    .attr("x", function(d) {
      return Math.abs(
        xScale(d["total"]) - xScale(getRecentDels(d.name)) - xScale(0)
      );
    })
    .attr("y", function(d, i) {
      return (chartHeight / candidateListGrouped.length) * i;
    })
    .attr("width", function(d) {
      return Math.abs(xScale(getRecentDels(d.name)) - xScale(0));
    })
    .attr("height", barHeight)
    .style("fill", COLORS.blue4)
    .attr("class", function(d) {
      var dropout = CANDIDATES_GROUPED.filter(x => x.name == d.name)[0]
        .dropoutdate
        ? "dropout"
        : "no-dropout";
      return classify(d["name"]) + " " + dropout;
    });

  /*
   * Render bar labels.
   */
  chartWrapper
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins["top"] + "px",
        left: "0"
      })
    )
    .selectAll("li")
    .data(config["data"])
    .enter()
    .append("li")
    .attr("style", function(d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px;"
      });
    })
    .attr("class", function(d) {
      return classify(d[labelColumn]);
    })
    .append("div")
    .html(function(d) {
      var matchingCandFullName = CANDIDATES_GROUPED.filter(
        x => x.name == d.name
      )[0].fullname;
      var matchingCand = groupedData.filter(x => x.name == d.name);
      var line2 = "";
      // if (matchingCandFullName != "Other") {
      //   line2 =
      //     "<br><span>Needs " +
      //     matchingCand[0].pctNeeded +
      //     " of remaining</span>";
      // }
      return matchingCand.length == 0
        ? d[labelColumn]
        : matchingCandFullName + line2;
    });

  /*
   * Pull out key numbers
   */
  var keyNums = chartWrapper
    .append("div")
    .attr("class", "key-numbers")
    .attr("style", function() {
      var s = "";
      s += "height: " + (chartHeight + margins["bottom"]) + "px;";
      s += "width: " + (margins["right"] - barGap) + "px;";
      s += "left: " + (margins["left"] + chartWidth + barGap) + "px;";
      s += "top: " + margins["top"] + "px;";
      return s;
    });

  // headers
  keyNums
    .append("h5")
    .attr("style", function() {
      var s = "";
      s += "width: " + valueWidth + "px; ";
      s += "bottom: " + (chartHeight + margins["bottom"] + 10) + "px; ";
      s += "left: 0px;";
      return s;
    })
    .attr("class", "total")
    .text("Total");

  keyNums
    .append("h5")
    .attr("style", function() {
      var s = "";
      s += "width: " + valueWidth + "px; ";
      s += "bottom: " + (chartHeight + margins["bottom"] + 10) + "px; ";
      s += "left: " + valueWidth * (cols - 1) + "px;";
      return s;
    })
    .html("Last 7 days");

  var positiveCandidates = [];

  for (cI in config.data.candidates) {
  }

  // values
  config.data.forEach(function(d, i) {
    if (candidateListGrouped.indexOf(d.name) == -1) {
      return;
    }
    var topPos = i * (barHeight + barGap);

    keyNums
      .append("div")
      .attr("class", "stat total")
      .attr("style", function() {
        var s = "";
        s += "left: 0;";
        s += "top: " + topPos + "px;";
        s += "height: " + barHeight + "px;";
        s += "width: " + valueWidth + "px;";
        return s;
      })
      .append("span")
      .text(fmtComma(d["total"]));

    keyNums
      .append("div")
      .attr("class", "stat d7")
      .attr("style", function() {
        var s = "";
        s += "left: " + valueWidth * (cols - 1) + "px;";
        s += "top: " + topPos + "px;";
        s += "height: " + barHeight + "px;";
        s += "width: " + valueWidth + "px;";
        return s;
      })
      .append("span")
      .text(function() {
        if (d.name != "Other") {
          return getRecentDels(d.name);
        } else {
          return "-";
        }
      });
  });

  // delegates needed line
  var annotations = chartElement.append("g").attr("class", "annotations");
  annotations
    .append("line")
    .attr("x1", xScale(delsRequired))
    .attr("x2", xScale(delsRequired))
    .attr("y1", -5)
    .attr("y2", chartHeight);
};

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile ? 4 : 16;
  var aspectHeight = isMobile ? 4 : 9;

  var margins = {
    top: 10,
    right: 100,
    bottom: 40,
    left: 40
  };

  var ticksX = 1000;
  var ticksY = 5;
  var roundTicksFactor = 200;

  // Mobile
  if (isMobile) {
    ticksX = 4;
    ticksY = 5;
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
  var extentMax = new Date();
  extentMax = new Date(extentMax.setDate(extentMax.getDate() + 1));
  // cap it at the date of DNC
  if (extentMax > new Date("2020-08-17")) {
    extentMax = new Date("2020-08-17");
  }
  // extentMax = extentMax.setHours(0,0,0,0);
  var extent = [new Date("2020-02-02"), extentMax];

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
      COLORS.blue3,
      COLORS.blue3,
      COLORS.blue3,
      COLORS.blue3,
      COLORS.blue3
    ]);

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
    .tickFormat(function(d, i, a) {
      return getAPMonth(d) + " " + d.getDate();
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
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(
  //         -chartHeight, 0, 0
  //       )
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

  // remove extra ticks
  var xTicksElements = chartElement.selectAll(".x .tick");
  var maxShowTicks = 10;
  if (isMobile) {
    maxShowTicks = 5;
  }

  var daysDiff = function(date1, date2) {
    return (date2 - date1) / (1000 * 3600 * 24);
  };

  var ticksShown = [];

  var removeDupeTicks = function(xTicksElements) {
    var lastTick = "";

    xTicksElements.each(function(el, ind) {
      if (lastTick == "") {
        lastTick = d3.select(this).text();
      } else if (d3.select(this).text() == lastTick) {
        d3.select(this).remove();
      } else {
        lastTick = d3.select(this).text();
      }
    });

    return chartElement.selectAll(".x .tick");
  };

  var primaryDatesArr = [];

  for (di in DEM_DATES) {
    primaryDatesArr.push(DEM_DATES[di].date);
  }

  // if march or further on
  if (extent[1] > new Date("2020-03-01")) {
    xTicksElements = removeDupeTicks(xTicksElements);
    xTicksElements.each(function(el, ind) {
      if (el.getDate() != 1 && ind != 0 && el.getDate() != 15) {
        d3.select(this).classed("hidden", true);
      } else if (ticksShown.indexOf(d3.select(this).text()) > -1) {
        d3.select(this).classed("hidden", true);
      } else {
        ticksShown.push(d3.select(this).text());
      }
    });
  }

  // In February, only show primary dates
  else {
    xTicksElements = removeDupeTicks(xTicksElements);
    xTicksElements.each(function(el, ind) {
      if (primaryDatesArr.indexOf(d3.select(this).text()) == -1) {
        d3.select(this).classed("hidden", true);
      }
    });
  }

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
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]))
    .curve(d3.curveStepAfter);

  var sortDate = function(a, b) {
    if (new Date(a.date) > new Date(b.date)) {
      return 1;
    } else {
      return -1;
    }
  };

  for (di in config.data) {
    config.data[di].values = config.data[di].values.sort(sortDate);
  }

  var existingData = [];

  var sortAmt = function(a, b) {
    if (a.amt > b.amt) {
      return 1;
    }
    if (a.amt < b.amt) {
      return -1;
    }
    if (a.date > b.date) {
      return 1;
    }
    if (a.date < b.date) {
      return -1;
    }
  };
  for (cI in config.data) {
    d = {};
    d.name = config.data[cI].name;
    d.values = config.data[cI].values.filter(d => d.date <= extent[1]);
    // add in a straight line from last point until today
    var amtData = {
      date: extentMax,
      amt: config.data[cI].values[config.data[cI].values.length - 1].amt
    };
    if (d.values.indexOf(amtData) == -1) {
      d.values.push(amtData);
    }
    d.values = d.values.sort(sortAmt);
    d.values.unshift({ date: new Date("2020-02-02"), amt: 0 });

    existingData.push(d);
  }



  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(existingData)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    // .attr("stroke", d => colorScale(d.name))
    .attr("d", function(d) {
      var matchingCand = CANDIDATES.filter(x => x.name == d.name)[0];

      // if (!matchingCand.dropout)  {
      return line(d.values);
      // }

      var preDropoutVals = [];
      for (dateI in d.values) {
        if (d.values[dateI].date < new Date(matchingCand["dropoutdate"])) {
          preDropoutVals.push(d.values[dateI]);
        }
      }
      preDropoutVals.push({
        date: new Date(matchingCand["dropoutdate"]),
        amt: preDropoutVals[preDropoutVals.length - 1].amt
      });
      return line(preDropoutVals);
    });
  // .classed("dropout-line", function(d) {
  //   return (CANDIDATES.filter(x=>x.name == d.name)[0].dropoutdate).indexOf('2020') > -1
  // });

  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(existingData)
    .enter()
    .append("text")
    .attr("class", function(d) {
      return "name-" + d.name;
    })
    .attr("x", function(d) {
      var matchingCand = CANDIDATES_GROUPED.filter(x => x.name == d.name)[0];

      // if (!matchingCand.dropout) {
      return xScale(lastItem(d)[dateColumn]) + 5;
      // }
      // else {
      //   return xScale(new Date(matchingCand.dropoutdate)) + 5
      // }
    })
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .attr("dy", function(d) {
      if (!isMobile) {
        var yshift = CANDIDATES_GROUPED.filter(x => x.name == d.name)[0][
          "step-y-shift"
        ];
      } else {
        var yshift = CANDIDATES_GROUPED.filter(x => x.name == d.name)[0][
          "step-y-shift-mobile"
        ];
      }
      if (yshift != undefined) {
        return yshift;
      }
      return;
    })
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = fmtComma(value);

      label = d.name + ": " + label;

      return label;
    });

  // reorder lines on hover
  // d3.selectAll("path.line")
  //   .on('mouseover', function(){
  //     var lineHover = this;
  //     d3.select("g.lines").append(function(){
  //       return  d3.select(lineHover).remove().node();
  //     })
  //   })
};

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
  return this.each(function() {
    this.parentNode.appendChild(this);
  });

  pymChild.sendHeight();
};

//first render
window.onload = onWindowLoaded;
