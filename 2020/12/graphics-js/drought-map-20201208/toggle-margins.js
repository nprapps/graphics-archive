
console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var pymChild = null;
var toggleTimeout;
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var onWindowLoaded = function() {
  // initUI();

  window.addEventListener("resize", function(){
    if (pymChild) {
        pymChild.sendHeight();
    }
  });

  console.log("pymstart")

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
}

// var render = function(containerWidth) {
//     if (!containerWidth) {
//         containerWidth = DEFAULT_WIDTH;
//     }
//
//     if (containerWidth <= MOBILE_THRESHOLD) {
//         isMobile = true;
//     } else {
//         isMobile = false;
//     }
//
//     // Update iframe
//     if (pymChild) {
//         pymChild.sendHeight();
//     }
// }

// var initUI = function() {
//     autoToggle();

//     d3.selectAll('.toggle-btn').on('click', function() {
//         event.preventDefault();
//         d3.select('#map-toggle').classed('clicked', true);
//         window.clearTimeout(toggleTimeout);

//         if (d3.select(this).attr('id') == 'toggle-2016') {
//             d3.select('.map-2016').classed('hidden', false);
//             d3.select('#legend-year').text('2016');
//         } else {
//             d3.select('#legend-year').text('2020');
//             d3.select('.map-2016').classed('hidden', true);
//         }

//         if (!d3.select(this).classed('active')) {
//             d3.select('.toggle-btn.active').classed('active', false);
//             d3.select(this).classed('active', true);
//         }
//     });

//     // Update iframe
//     if (pymChild) {
//         pymChild.sendHeight();
//     }
// };

// var autoToggle = function() {
//     var toggleWrap = d3.select('#map-toggle');

//     var yearList = ['2016', '2020', '2016', '2020'];
//     toggleStep(0);

//     function toggleStep(year_i) {
//         if (year_i < yearList.length) {
//             var year = yearList[year_i];

//             // Don't auto-toggle if someone has clicked
//             if (!toggleWrap.classed('clicked')) {
//                 d3.select('#legend-year').text(year);

//                 if (year == '2016') {
//                     d3.select('.map-2016').classed('hidden', false);
//                 } else {
//                     d3.select('.map-2016').classed('hidden', true);
//                 }

//                 d3.select('.toggle-btn.active').classed('active', false);
//                 d3.select('#toggle-' + year).classed('active', true);

//                 toggleTimeout = window.setTimeout(toggleStep, 1200, year_i+1);
//             }
//         }
//     }
// };


// wait for images to load
window.onload = onWindowLoaded;
