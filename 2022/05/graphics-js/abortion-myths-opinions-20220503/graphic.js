console.clear();
var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

// check if this user has set "prefers reduced motion" in their browser
// https://since1979.dev/respecting-prefers-reduced-motion-with-javascript-and-react/
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");



//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;

    //cross out myth and fade in fact on scroll
    var observer = new IntersectionObserver(intersectionCallback, {threshold: 1});
    var target = document.querySelector(".target");
    observer.observe(target);

    function intersectionCallback(entries, observer){
      entries.forEach(entry=> {
        if(entry.isIntersecting){
          entry.target.classList.add("active");
        }
      })
    }


    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var m = 1;
    var day = 1;
    var y = Number(d.date);
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column]
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
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data,
    dateColumn: "date",
    valueColumn: "amt"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
