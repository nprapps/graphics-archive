console.clear();


var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
};
var { classify } = require("./lib/helpers");
var $ = require("./lib/qsa");

var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });


  // show/hide interactivity
  var hidden = true;
  var parent = document.querySelector("#line-chart");

  // Add toggle button that can collapse/expand the list.
  var toggleButton = $.one(".toggle-table");
  toggleButton.addEventListener('click', function() {
    hidden = !hidden
    parent.classList.toggle("hide-others", hidden);
    if (hidden) {
      toggleButton.textContent = toggleButton.dataset.more;
    } else {
      toggleButton.textContent = toggleButton.dataset.less;
    }
    pymChild.sendHeight();

  });

  // d3.select(".show-hide").on("click", function(){
  //   if (hidden == true) {
  //     d3.selectAll("#line-chart").style("display", "block")
  //     hidden = false;
  //   }
  //   else {
  //     d3.selectAll(".graphic-wrapper").style("display", "none")
  //     d3.selectAll(".always-show").style("display", "block")
  //     hidden = true;
  //   }
  // })
};

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    y = y < 50 ? 2000 + y : y;
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date" || column == 'state' || column == 'state_name' || column == "pop" || column == "hospitalized") continue;


    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column],
        state:  d['state'],
      }))
    });
  }
  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  element.innerHTML = "";
  var width = element.offsetWidth;
  // function onlyUnique(value, index, self) {
  //   return self.indexOf(value) === index;
  // }
  // var uniqueStates = data[0].values.map(x => x.state)
  // uniqueStates = uniqueStates.filter(onlyUnique)
  // uniqueStates = uniqueStates.sort();
  uniqueStates = ["Nebraska", "New Mexico", "North Dakota", "South Dakota", "Wisconsin", "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nevada", "New Hampshire", "New Jersey", "New York", "North Carolina", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wyoming"]



  
  for (i in uniqueStates) {
    // if (i!=0) { continue}
    renderLineChart({
      container,
      width: 300,
      data,
      dateColumn: "date",
      valueColumn: "amt",
      state: uniqueStates[i]
    });
  }







  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
