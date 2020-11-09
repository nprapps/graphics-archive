var pym = require("./lib/pym");
var $ = require('./lib/qsa');
var ANALYTICS = require("./lib/analytics");
var { isMobile } = require('./lib/breakpoints');
require("./lib/webfonts");
var pymChild = null;

var mobile;
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

  mobile = isMobile.matches;

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    window.addEventListener("resize", () => onResize());
  });
};

var onResize = function() {
  if (mobile != isMobile.matches) {
    mobile = isMobile.matches;
    $.one('#table-graphic-poorest').classList.remove('open');
    $.one('#table-graphic-richest').classList.remove('open');

    var buttons = document.querySelectorAll("button");
    buttons.forEach(function(b) {
      b.textContent = b.dataset.more;
    });

  }
  pymChild.sendHeight();
}

// button pressing
var onButtonPressed = function(evt) {
  var btn = evt.target;
  var detail;
  switch (btn.id) {
    case 'btn-richest':
      detail = $.one('#table-graphic-richest');
      detail.classList.toggle('open');
      break;
    case 'btn-poorest':
      detail = $.one('#table-graphic-poorest');
      detail.classList.toggle('open');
      break;
    default:
      var detail1 = btn.parentNode.querySelector('#table-graphic-richest');
      detail = btn.parentNode.querySelector('#table-graphic-poorest');
      detail1.classList.toggle('open');
      detail.classList.toggle('open');
      break;
  }
  var detailID = detail.id;
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

initialize();