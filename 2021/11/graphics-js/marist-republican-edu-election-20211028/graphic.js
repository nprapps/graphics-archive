var d3 = {
  ...require("d3-selection/dist/d3-selection.min")
};
var pym = require("./lib/pym");
var { isMobile } = require("./lib/breakpoints");
require("./lib/webfonts");

// Global vars
var pymChild = null;
var renderDotChart = require("./renderDotChart");

// Initialize the graphic.
var onWindowLoaded = function() {
  if (d3.select('body').classed('promo')) {
      isPromo = true;
  }

  render(window.DATA);
  window.addEventListener("resize", () => render(window.DATA));

  pym.then(child => {
    pymChild = child;
    pymChild.sendHeight();
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#dot-chart";
  var element = document.querySelector(container);
  element.innerHTML = "";
  var width = element.offsetWidth;

  // draw the charts
  if (isMobile.matches) {
    for (var i = 0; i < data.length; i++) {
      var chartElement = d3.select(container).append('div')
        .attr('class', 'chart chart-' + i);

      // Render the chart!
      renderDotChart({
        container: container + ' .chart-' + i,
        width,
        data: [ data[i] ],
        idx: i,
        labelColumn: "label",
        minColumn: "min",
        maxColumn: "max"
      });
    }
  } else {
    // Render the chart!
    renderDotChart({
      container,
      width,
      data,
      labelColumn: "label_fmt",
      minColumn: "min",
      maxColumn: "max"
    });
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
