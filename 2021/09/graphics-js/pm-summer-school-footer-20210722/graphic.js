var $ = require("./lib/qsa");
var pym = require("./lib/pym");
var pymChild = null;
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dot = require("./lib/dot");
var templateSource = require("./partials/_episodes.html");

var template = dot.compile(templateSource);

async function init() {
  if (window.location.hostname == "apps.npr.org") {
    var request = await fetch("https://apps.npr.org/dailygraphics/data/sheets/pm-summer-school-footer-20210722.json");
    var copy = await request.json();

    var filteredData = copy.data.filter(d => d.season == window.SEASON);
    var episodes = template(filteredData);

    var listEl = $.one("#episode-list");
    listEl.innerHTML = episodes;

    pymChild.sendHeight();
  }
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
