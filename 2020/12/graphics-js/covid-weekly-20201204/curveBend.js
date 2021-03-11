var pym = require('./lib/pym');
var ANALYTICS = require('./lib/analytics');
require('./lib/webfonts');
var { isMobile } = require('./lib/breakpoints');
var { inDays } = require('./util');
var $ = require('./lib/qsa');

console.clear();

var raw_data = [];
var per_capita = [];
var new_total = [];
var allStates = [];
var filterOut = [
  'American Samoa',
  'Guam',
  'Marshall Islands',
  'Micronesia',
  'Northern Marianas',
  'Palau',
  'Virgin Islands',
  'Grand Princess',
  'Diamond Princess',
];
var pymChild;
var stateSelection = 'all states';
var firstHighlightState = 'Wisconsin';
// var firstHighlightState = "Maine";
var allData = [];

var {
  COLORS,
  getAPMonth,
  classify,
  makeTranslate,
  wrapText,
  fmtComma,
} = require('./lib/helpers');

var d3 = {
  ...require('d3-axis/dist/d3-axis.min'),
  ...require('d3-scale/dist/d3-scale.min'),
  ...require('d3-selection/dist/d3-selection.min'),
  ...require('d3-shape/dist/d3-shape.min'),
  ...require('d3-interpolate/dist/d3-interpolate.min'),
  ...require('d3-transition/dist/d3-transition.min'),
  ...require('d3-force/dist/d3-force.min'),
};

//Initialize graphic
var onWindowLoaded = function () {
  formatData();
  render();

  window.addEventListener('resize', render);
  $.one('.controls').addEventListener('change', () => render());

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format data
var formatData = function () {
  var today = LABELS.dateUpdatedCode; // get today's date
  var daysSinceFirst = -1;

  // format data for regular logarithmic chart
  var states = {};
  for (var row of TIMESERIES_DATA) {
    var s = row.Province_State;
    if (!s || filterOut.includes(s)) continue;
    var [y, m, d] = row.Report_Date_String.split('/');
    var reported = [m, d, y].join('/');
    var day = inDays(reported);
    var count = row.Confirmed;

    if (!states[s] && count >= 100)
      states[s] = {
        name: s,
        values: [],
        first100: day,
      };
    var state = states[s];
    if (!state) continue;
    state.values.push({
      date: day - state.first100,
      amt: count,
    });
  }

  // format data for new vs total cases chart
  newTotal = {};
  for (var row of TIMESERIES_DATA) {
    var s = row.Province_State;
    if (!s || filterOut.includes(s)) continue;
    var count = row.Confirmed;

    if (!newTotal[s] && count >= 1)
      newTotal[s] = {
        name: s,
        values: [],
      };
    var state = newTotal[s];
    if (!state) continue;
    state.values.push({
      // since total cases are on the x-axis, it is called date.
      date: count,
    });

    state.values.forEach(function (d, i) {
      var allDates = state.values;

      // calculate new cases
      var prevDayCases = i > 0 ? allDates[i - 1].date : 0;
      var thisDayCases = d.date;
      var newCases = thisDayCases - prevDayCases;
      d.new_cases = newCases;

      // 7-day average for new cases
      var avg7newCases = 0;
      var numDaysForAverage = 7;
      if (i >= 6) {
        var last7newCases = 0;
        for (var c = 6; c >= 0; c--) {
          // if new cases are negative, exclude them from the calculation
          if (allDates[i - c].new_cases < 0) {
            numDaysForAverage -= 1;
          } else {
            last7newCases += allDates[i - c].new_cases;
          }
        }
        avg7newCases = last7newCases / numDaysForAverage;
      }
      d.amt = avg7newCases;
    });
  }

  // format data for new vs. total deaths chart
  newDeaths = {};
  for (var row of TIMESERIES_DATA) {
    var s = row.Province_State;
    if (!s || filterOut.includes(s)) continue;
    var count = row.Deaths;

    if (!newDeaths[s] && count >= 1)
      newDeaths[s] = {
        name: s,
        values: [],
      };
    var state = newDeaths[s];
    if (!state) continue;
    state.values.push({
      // since total cases are on the x-axis, it is called date.
      date: count,
    });

    state.values.forEach(function (d, i) {
      var allDates = state.values;

      // calculate new cases
      var prevDayCases = i > 0 ? allDates[i - 1].date : 0;
      var thisDayCases = d.date;
      var newCases = thisDayCases - prevDayCases;
      d.new_cases = newCases;

      // 7-day average for new cases
      var avg7newCases = 0;
      var numDaysForAverage = 7;
      if (i >= 6) {
        var last7newCases = 0;
        for (var c = 6; c >= 0; c--) {
          // if new cases are negative, exclude them from the calculation
          if (allDates[i - c].new_cases < 0) {
            numDaysForAverage -= 1;
          } else {
            last7newCases += allDates[i - c].new_cases;
          }
        }
        avg7newCases = last7newCases / numDaysForAverage;
      }
      d.amt = avg7newCases;
    });
  }

  raw_data = Object.keys(states).map(s => states[s]);
  new_total = Object.keys(states).map(s => newTotal[s]);
  new_deaths = Object.keys(states).map(s => newDeaths[s]);

  // Per capita data
  // for (var i = 0; i < raw_data.length; i++) {
  //   per_capita.push({
  //     name: raw_data[i].name,
  //     values: raw_data[i].values.map(d => ({
  //       date: d.date,
  //       amt: (d.amt / POPULATION[raw_data[i].name]) * 100000 // match population data in sheet to state and calc per capita
  //     }))
  //   });
  // }

  // allData.push({ raw_data, per_capita, new_total }); // push into one big dataset
  allData.push({ raw_data, new_total, new_deaths }); // push into one big dataset

  // Dropdown groups
  allStates = raw_data.map(d => d.name);
  allStates.unshift('All States');
};

// Render graphics
var render = function () {
  // Set up chart
  var container = '#line-chart';
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var toggleSelection = $.one(`input[type=radio]:checked`).value;
  d3.select(container).attr('class', 'graphic ' + toggleSelection);

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var dateColumn = 'date';
  var valueColumn = 'amt';

  var margins = {
    top: 60,
    right: 115,
    bottom: 50,
    left: 60,
  };

  var ticksXLinear = 10;
  var ticksY = 3;
  var ticksYNew = 5;
  var ticksXLog = 5;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksXLinear = 5;
    ticksY = 3;
    ticksXLog = 4;
    margins.right = 95;
  }

  // Calculate actual chart dimensions
  var chartWidth = width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(container);
  containerElement.html('');

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper
    .append('svg')
    .attr('width', chartWidth + margins.left + margins.right)
    .attr('height', chartHeight + margins.top + margins.bottom)
    .append('g')
    .attr('transform', `translate(${margins.left},${margins.top})`);

  // Initialize x and y axis
  var xScaleLinear = d3.scaleLinear().range([0, chartWidth]);
  var xScaleLog = d3.scaleLog().range([chartWidth, 1]);

  var xAxisLinear = d3.axisBottom().scale(xScaleLinear).ticks(ticksXLinear);

  // xAxis case for new vs. total case
  var xAxisLog = d3
    .axisBottom()
    .scale(xScaleLog)
    .ticks(ticksXLog)
    .tickFormat(d => fmtComma(d));

  var yScale = d3.scaleLog().range([chartHeight, 0.1]);
  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => fmtComma(d));

  // Append x and y axis to chart
  chartElement
    .append('g')
    .attr('class', 'x axis xAxis')
    .attr('transform', makeTranslate(0, chartHeight));

  chartElement.append('g').attr('class', 'y axis yAxis');

  // Initialize the part of the chart that will update with new data/selections
  var updatingLines = chartElement.append('g').attr('class', 'state-lines');
  var updatingValues = chartElement.append('g').attr('class', 'state-values');
  var updatingAxisLabel = chartElement
    .append('text')
    .attr('class', 'axis-label');
  var updatingyAxisLabel = chartElement
    .append('text')
    .attr('class', 'axis-label');

  // Update function that takes a dataset as input and updates the chart
  var update = function (config) {
    // Create new data from selection + sort in ascending order
    var logXScale =
      config.toggleSelection == 'new_total' ||
      config.toggleSelection == 'new_deaths';
    var logCases = config.toggleSelection == 'new_total';
    var xScale = logXScale ? xScaleLog : xScaleLinear;
    var ticksX = logXScale ? ticksXLog : ticksXLinear;
    var xAxis = logXScale ? xAxisLog : xAxisLinear;
    var lastItem = d => d.values[d.values.length - 1];
    var fourweeksAgo = d => d.values[d.values.length - 31];
    var oneWeekAgo = d => d.values[d.values.length - 10];
    var maxFourWeeksAgo = d =>
      d.values
        .slice(d.values.length - 21, d.values.length)
        .sort((a, b) => a.amt - b.amt)
        .slice(-1)
        .pop();
    var minFourWeeksAgo = d =>
      d.values
        .slice(d.values.length - 21, d.values.length)
        .sort((a, b) => b.amt - a.amt)
        .slice(-1)
        .pop();
    var peakAmt = d =>
      d.values
        .slice(0)
        .sort((a, b) => a.amt - b.amt)
        .slice(-1)
        .pop();

    var data = allData[0][config.toggleSelection].sort(function (a, b) {
      return (
        a.values[a.values.length - 1].amt - b.values[b.values.length - 1].amt
      );
    });

    // Find max date for x axis
    var dates = 0;
    for (var i = 0; i < data.length; i++) {
      var state_dates = data[i].values.map(d => d.date);
      if (state_dates[state_dates.length - 1] > dates) {
        dates = state_dates[state_dates.length - 1];
      }
    }
    var extent = config.toggleSelection == 'new_deaths'? [100000, 1] : [1000000, 1];

    // Update x axis + add grid
    xScale.domain(extent);
    d3.transition()
      .selectAll('.xAxis')
      .duration(1000)
      .call(xAxis.ticks(ticksX).tickSize(-chartHeight, 0, 0).tickPadding(10));

    var values = data.reduce(
      (acc, d) =>
        acc.concat(
          d.values.filter(v => v[valueColumn]).map(v => v[valueColumn])
        ),
      []
    );

    var floors = values.map(
      v => Math.floor(v / roundTicksFactor) * roundTicksFactor
    );
    var min = Math.min.apply(null, floors);

    min = min >= 100 ? 100 : 0.1;

    var ceilings = values.map(
      v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
    );
    var max = Math.max.apply(null, ceilings);
    if (config.toggleSelection == 'raw_data') {
      max = max;
    } else if (config.toggleSelection == 'new_deaths') {
      max = 1000;
    } else {
      max = 10000;
    }

    // Update y axis + add grid
    var yDomain = logXScale ? [1, max] : [min, max];

    // yAxis case for new vs total chart
    yScale.domain(yDomain);
    d3.transition()
      .selectAll('.yAxis')
      .duration(1000)
      .call(yAxis.ticks(3).tickSize(-chartWidth, 0, 0).tickPadding(10));

    // Get position of New York's label
    var yOffset = isMobile.mobile ? -5 : 15;
    var newYorkData = lastItem(data.filter(d => d.name == 'New York')[0]);
    var newYorkX = xScale(newYorkData[dateColumn]) + 5;
    var newYorkY = yScale(newYorkData[valueColumn]);
    var newYorkWidth = logXScale ? 100 : 55;
    var labelHeight = logXScale ? 42 : 30;
    var labelWidth;
    if (config.toggleSelection == 'new_deaths') {
      labelWidth = isMobile.matches ? 95 : 110;
    } else {
      labelWidth = isMobile.matches ? 105 : 120;
    }

    var overlap = function (x, y, width, name) {
      return (
        x + width > newYorkX &&
        x < newYorkX + newYorkWidth &&
        y < newYorkY + labelHeight &&
        y + labelHeight > newYorkY
      );
    };

    // Render lines to chart.
    var line = d3
      .line()
      .defined(d => d[valueColumn]) // blank the undefined or 0 values
      .x(function (d) {
        return xScale(d[dateColumn]);
      })
      .y(d => yScale(d[valueColumn]));

    // Define updating group
    var u = updatingLines.selectAll('path').data(data);

    // Remove old data
    u.exit().remove();

    // Update data
    u.enter()
      .append('path')
      .merge(u)
      .attr('class', d => 'line ' + classify(d.name))
      .attr('fill', 'none')
      .attr('d', function (d) {
        if (logXScale) {
          // filter out data smaller than 1
          var filtered = d.values.filter(function (d) {
            return d.amt >= 1;
          });
          return line(filtered);
        } else {
          return line(d.values);
        }
      })
      .attr('class', function (d) {
        if (
          d.name.toLowerCase() == config.stateSelection ||
          (d.name == firstHighlightState &&
            config.stateSelection == 'all states')
        ) {
          return 'highlight';
        } else if (d.name == 'New York') {
          return 'highlight medium';
        } else {
          return classify(d.name);
        }
      });

    // Update axis labels if new vs. total cases selected
    var xAxisLabels = updatingAxisLabel;

    xAxisLabels.exit().remove();
    xAxisLabels
      .attr('y', chartHeight + 40)
      .attr('x', xScaleLinear(0))
      .text(function (d) {
        // return logXScale ? "Total confirmed cases since January" : "Days since 100th case ⟶";
        return config.toggleSelection == 'new_total'
          ? 'Total confirmed cases since January'
          : 'Total confirmed deaths  since January';
      });

    var yAxisLabels = updatingyAxisLabel;

    yAxisLabels.exit().remove();
    yAxisLabels
      .attr('transform', 'translate(-50,' + chartHeight / 2 + ')rotate(-90)')
      .style('text-anchor', 'middle')
      .text(function (d) {
        // return logXScale ? "New cases per day (7-day avg)" : "";
        return config.toggleSelection == 'new_total'
          ? 'New cases per day (7-day avg)'
          : 'New deaths per day (7-day avg)';
      });

    // If overlap, shift to peak of curve, and adjust up if needed
    var getYPosition = function (d, currY, currX, labelWidth) {
      var newAnchor = peakAmt(d);
      let newY = yScale(newAnchor[valueColumn]) - 40;
      let newX = yScale(newAnchor[valueColumn]);
      var shiftAmt = -5;
      while (overlap(newX, newY, labelWidth) && newY >= 0) {
        newY += shiftAmt;
      }
      return newY;
    };

    var getInitialYPosition = function (d) {
      // case for y position if y-value is low or 0 because log scales can't have 0 values
      if (lastItem(d)[valueColumn] <= 5) {
        return yScale(8);
      } else {
        return yScale(lastItem(d)[valueColumn]);
      }
    };

    // Value labels
    var labels = updatingValues.selectAll('text').data(data);

    labels.exit().remove();
    labels
      .enter()
      .append('text')
      .merge(labels)
      .attr('y', function (d) {
        // Calculate y position based on whether labels overlap
        var y = getInitialYPosition(d);

        var x = xScale(lastItem(d)[dateColumn]) + 2;

        // Adjust labels if they overlap with NY label
        if (d.name != 'New York') {
          if (overlap(x, y, labelWidth, d.name)) {
            y = getYPosition(d, y, x, labelWidth);
          }
        }

        return y;
      })
      .attr('x', function (d) {
        // Calculate x position based on whether labels overlap
        var y = getInitialYPosition(d);
        var x = xScale(lastItem(d)[dateColumn]) + 2;
        if (d.name != 'New York') {
          if (overlap(x, y, labelWidth, d.name)) {
            return xScale(peakAmt(d)[dateColumn]) - 40;
          }
        }
        return xScale(lastItem(d)[dateColumn]) + 2;
      })
      .html(function (d) {
        var cases = `${lastItem(d)
          .amt.toFixed(0)
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

        var deaths;
        if (lastItem(d).amt > 0 && lastItem(d).amt < 1) {
          deaths = '<1';
        } else {
          deaths = `${lastItem(d)
            .amt.toFixed(0)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
        }

        // get total cases value for new vs. total chart
        var totals = `${lastItem(d)
          [dateColumn].toFixed(0)
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

        var x = parseFloat(d3.select(this).attr('x')); // get the x position of the text
        var y = parseFloat(d3.select(this).attr('y')); // get the y position of the text

        if (logXScale && config.toggleSelection == 'new_total') {
          var newCaseUnits = cases == 1 ? 'case' : 'cases';
          return `<tspan x=${x} y=${y}>${d.name}:</tspan>
              <tspan x=${x} y=${
            y + yOffset
          } class='value-label'>${cases} new ${newCaseUnits}/day</tspan>
              <tspan x=${x} y=${
            y + 30
          } class='value-label'>${totals} total cases</tspan>`;
        } else if (logXScale && config.toggleSelection == 'new_deaths') {
          var newDeathUnits = deaths == 1 ? 'death' : 'deaths';

          return `<tspan x=${x} y=${y}>${d.name}:</tspan>
            <tspan x=${x} y=${
            y + yOffset
          } class='value-label'>${deaths} new ${newDeathUnits}/day</tspan>
            <tspan x=${x} y=${
            y + 30
          } class='value-label'>${totals} total deaths</tspan>`;
        } else {
          return `<tspan x=${x} y=${y}> ${d.name}: </tspan> <tspan x=${x} y=${
            y + yOffset
          }> ${cases} </tspan>`;
        }
      })
      .attr('class', function (d) {
        if (
          d.name.toLowerCase() == config.stateSelection ||
          (d.name == firstHighlightState &&
            config.stateSelection == 'all states')
        ) {
          return 'highlight-label highlight';
        } else if (d.name == 'New York') {
          return 'highlight-label medium';
        } else {
          return 'hide-label label-' + classify(d.name);
        }
      });

    // Dropdown
    var stateMenu = d3.select('#dropdown');

    stateMenu
      .selectAll('option')
      .data(allStates)
      .enter()
      .append('option')
      .text(d => d)
      .attr('value', d => d);

    // move highlighted line to front on initial view
    d3.selectAll('.highlight').moveToFront();

    stateMenu.on('change', function () {
      var section = document.getElementById('dropdown');
      stateSelection = section.options[
        section.selectedIndex
      ].value.toLowerCase();
      var toggleSelection = $.one(`input[type=radio]:checked`).value;

      update({
        toggleSelection,
        stateSelection,
      });

      d3.selectAll('.highlight').moveToFront();
    });
  };

  // On window load, run update function on raw totals dataset
  update({
    toggleSelection,
    stateSelection,
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//  *
// * Select an element and move it to the front of the stack
// */
d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
