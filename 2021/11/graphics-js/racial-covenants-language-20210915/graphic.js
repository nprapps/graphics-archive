var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var $ = require("./lib/qsa");
var { isMobile } = require("./lib/breakpoints");
var Masonry = require('masonry-layout');
var pymChild = null;
var msnry = null;
var toggleButton = null;

var createMasonry = function() {
  if (!isMobile.matches) {
    msnry = new Masonry('.grid', {
      columnWidth: '.grid-sizer',
      itemSelector: '.grid-item',
      percentPosition: true,
      transitionDuration: '0.2s'
    });
    msnry.on("layoutComplete", onMasonryLayout);
  } else {
    if (msnry) {
      msnry.destroy();
    }
  }
}

var onMasonryLayout = function() {
  // console.log("onLayout");
  if (pymChild) {
    pymChild.sendHeight();
  }
}

var onToggleClicked = function() {
  var grid = $.one(".grid");
  if (grid.classList.contains("show-all")) {
    grid.classList.remove("show-all");
    toggleButton.textContent = toggleButton.dataset.more;
    pymChild.scrollParentToChildEl("quote-grid");
  } else {
    grid.classList.add("show-all");
    toggleButton.textContent = toggleButton.dataset.less;
  }
  pymChild.sendHeight();
}

// var onGridMouseOver = function() {
//   this.classList.add("active");
//   msnry.layout();
// }
//
// var onGridMouseOut = function() {
//   this.classList.remove("active");
//   msnry.layout();
// }

var onResize = function() {
  createMasonry();

  if (pymChild) {
    pymChild.sendHeight();
  }
}

pym.then(child => {
  pymChild = child;

  // create grid (for larger than mobile screens)
  createMasonry();

  // var gridItems = document.querySelectorAll(".grid-item");
  // gridItems.forEach((item, i) => {
  //   item.addEventListener("mouseover", onGridMouseOver);
  //   item.addEventListener("mouseout", onGridMouseOut);
  // });

  // Add toggle button that can collapse/expand the list.
  toggleButton = $.one(".toggle-grid");
  toggleButton.addEventListener('click', onToggleClicked);

  pymChild.sendHeight();
  window.addEventListener("resize", onResize);
});
