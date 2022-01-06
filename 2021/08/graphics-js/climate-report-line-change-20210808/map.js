var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function () {
  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });

  window.addEventListener("resize", () =>
    pym.then(child => {
      pymChild = child;
      child.sendHeight();
    })
  );
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
