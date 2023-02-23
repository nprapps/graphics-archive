var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var {
  isMobile
} = require("./lib/breakpoints");

var pymChild = null;
var isMobile = isMobile.matches;
var toggleTimeout;

var d3 = {
  ...require("d3-selection/dist/d3-selection.min")
};
``
/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
  pym.then(function(child) {
    pymChild = child;
    child.sendHeight();
    window.addEventListener("resize", render);
  });

  initUI();
}

/*
 * Render the graphic.
 */
var render = function() {
  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

var initUI = function() {
  autoToggle();

  d3.selectAll('.toggle-btn').on('click', onToggleClicked);
};

var onToggleClicked = function() {
  d3.select('#image-toggle').classed('clicked', true);
  window.clearTimeout(toggleTimeout);

  if (d3.select(this).attr('id') == 'toggle-1') {
    d3.select('.image-1').classed('hidden', false);
  } else {
    d3.select('.image-1').classed('hidden', true);
  }

  if (!d3.select(this).classed('active')) {
    d3.select('.toggle-btn.active').classed('active', false);
    d3.select(this).classed('active', true);
  }
}

var autoToggle = function() {
  var toggleWrap = d3.select('#image-toggle');

  var stepList = [2, 1, 2, 1, 2];
  toggleStep(0);

  function toggleStep(step_i) {
    if (step_i < stepList.length) {
      var step = stepList[step_i];

      // Don't auto-toggle if someone has clicked
      if (!toggleWrap.classed('clicked')) {
        if (step == 1) {
          d3.select('.image-1').classed('hidden', false);
        } else {
          d3.select('.image-1').classed('hidden', true);
        }

        d3.select('.toggle-btn.active').classed('active', false);
        d3.select('#toggle-' + step).classed('active', true);

        toggleTimeout = window.setTimeout(toggleStep, 2000, step_i + 1);
      }
    }
  }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
