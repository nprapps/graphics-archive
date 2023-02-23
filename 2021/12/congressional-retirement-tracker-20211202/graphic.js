var $ = require("./lib/qsa");
var pym = require("./lib/pym");
var pymChild;
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dot = require("./lib/dot");
var templateSource;
var template;
var graphicEl;

// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))

async function init() {
  switch (window.TYPE) {
    case "house_d":
    case "house_r":
      templateSource = require("./partials/_table_house.html");
      graphicEl = $.one("#retire-table tbody");
      break;
    case "counter":
      templateSource = require("./partials/_counter.html")
      graphicEl = $.one("#counter-graphic");
      break;
    default:
      templateSource = require("./partials/_table_senate.html");
      graphicEl = $.one("#retire-table tbody");
      break;
  }
  template = dot.compile(templateSource);

  // if (window.location.hostname == "apps.npr.org") {
    var request = await fetch("https://apps.npr.org/dailygraphics/data/sheets/congressional-retirement-tracker-20211202.json");
    var copy = await request.json();

    var filteredData = copy[window.TYPE];
    var graphicContent = template(filteredData);
    graphicEl.innerHTML = graphicContent;

    pymChild.sendHeight();
  // }
};

var onWindowLoaded = function() {
  pym.then(child => {
    pymChild = child;

    init();

    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
  });
}

window.onload = onWindowLoaded;
