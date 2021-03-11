var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var renderLineChart = require("./renderToplineChart");
var { inDays } = require("./util");

var LATEST_DATE = LABELS.dateUpdatedCode;


// Initialize the graphic.
var onWindowLoaded = function() {
  var series = formatData(TIMESERIES_DATA);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = data.filter(d => !d.Province_State);


  series.forEach(function(d, i) {
    var [y, m, day] = d.Report_Date_String.split("/").map(Number);
    d.date = new Date(y, m - 1, day);

    // calculate new cases
    var prevDayCases = i > 0 ? series[i - 1].Confirmed : 0;
    var thisDayCases = d.Confirmed;
    var newCases = thisDayCases - prevDayCases;
    d.new_cases = newCases;

    // calculate 7-day avg of new cases per day
    var avg7DayCases = null;
    if (i >= 6) {
      var last7totalCases = newCases;
      for (var c = 6; c > 0; c--) {
        last7totalCases += series[i - c].new_cases;
      }
      avg7DayCases = Math.round(last7totalCases / 7);
    }
    d.avg_7day_cases = avg7DayCases;

    // calculate new deaths
    var prevDayDeaths = i > 0 ? series[i - 1].Deaths : 0;
    var thisDayDeaths = series[i].Deaths;
    var newDeaths = thisDayDeaths - prevDayDeaths;
    d.new_deaths = newDeaths;

    // calculate 7-day avg of new deaths per day
    var avg7DayDeaths = null;
    if (i >= 6) {
      var last7totalDeaths = newDeaths;
      for (var c = 6; c > 0; c--) {
        last7totalDeaths += series[i - c].new_deaths;
      }
      avg7DayDeaths = Math.round(last7totalDeaths / 7);
    }
    d.avg_7day_deaths = avg7DayDeaths;

    // calculate new deaths
    var prevDayHosps = i > 0 ? series[i - 1].current_hospitalizations : 0;
    var thisDayHosps = series[i].current_hospitalizations;
    var newHosps = thisDayHosps - prevDayHosps;
    d.new_hospitalizations = newHosps;

    // calculate 7-day avg of new hosps per day
    var avg7DayHosps = null;
    if (i >= 6) {
      var last7totalHosps = series[i].current_hospitalizations;
      for (var c = 6; c > 0; c--) {
        last7totalHosps += series[i - c].current_hospitalizations;
      }
      avg7DayHosps = Math.round(last7totalHosps / 7);
    }
    d.avg_7day_hospitalizations = avg7DayHosps;
  });

  return series.sort((a, b) => a.date - b.date);
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  var caseDates = ANOMALY_DATA.filter(d => d.cases).map(d => inDays(d.date));
  var deathDates = ANOMALY_DATA.filter(d => d.deaths).map(d => inDays(d.date));

  // Render the chart!
  [TYPE].forEach((item, i) => {
    var container = "#chart-" + item;
    var element = document.querySelector(container);
    var width = element.offsetWidth;

    renderLineChart({
      container: "#chart-" + item,
      width,
      data: data,
      dateColumn: "date",
      valueColumn: item == 'hospitalizations' ? 'current_hospitalizations' : "new_" + item,
      avgColumn: "avg_7day_" + item,
      daysShown: DAYSSINCESTART,
      specialDates: item == 'cases' ? caseDates : deathDates,
      item: item
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
