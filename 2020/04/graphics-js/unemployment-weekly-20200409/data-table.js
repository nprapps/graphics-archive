var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var pymChild = null;

// Initialize the graphic.
var initialize = function() {
  // If sortable:
  // window.Tablesort = require("tablesort");
  // require("tablesort/dist/sorts/tablesort.number.min");
  // Tablesort(document.querySelector("#state-table"))

  var buttons = document.querySelectorAll("button");
  buttons.forEach(function(b) {
    b.addEventListener('click', onButtonPressed);
  });

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    // child.onMessage("on-screen", function(bucket) {
    //     ANALYTICS.trackEvent("on-screen", bucket);
    // });
    // child.onMessage("scroll-depth", function(data) {
    //     data = JSON.parse(data);
    //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    // });

    window.addEventListener("resize", () => child.sendHeight());
  });
};

// button pressing
var onButtonPressed = function(evt) {
  var btn = evt.target;
  var detail = btn.parentNode.querySelector('.graphic');
  var detailID = detail.id;
  detail.classList.toggle('open');
  pymChild.sendHeight();

  switch(detail.classList.contains('open')) {
    case true:
      btn.textContent = btn.dataset.less;
      break;
    case false:
      btn.textContent = btn.dataset.more;
      pymChild.scrollParentToChildEl(detailID);
      break;
  }
}

module.exports = initialize;
