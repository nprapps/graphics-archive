var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild = null;

// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))

pym.then(child => {
  pymChild = child;
  var buttons = document.querySelectorAll("button");
  buttons.forEach(function(b) {
    b.addEventListener('click', onButtonPressed);
  });

  child.sendHeight();
  window.addEventListener("resize", () => child.sendHeight());
});

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
