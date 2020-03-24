var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");

// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))

pym.then(child => {

  child.sendHeight();

  child.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
  });
  child.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });

  window.addEventListener("resize", () => child.sendHeight());

    // unclick sorted class on first click...workaround
  document.addEventListener('click', function (event) {
    // If the clicked element doesn't have the right selector, bail
    // if (!event.target.matches('.show-button')) return;

    if (event.target.matches('.see-more')) {
      // Don't follow the link
      event.preventDefault();

      // show/hide original text    
      if (!event.target.classList.contains("active")) {
        event.target.classList.add('active');
        event.target.innerHTML = "↓ Show more";

        
        event.target.previousElementSibling.classList.remove('show');
      } else {        
        event.target.classList.remove('active');
        event.target.innerHTML = "↑ Show less";

        event.target.previousElementSibling.classList.add('show');
        
      }
    }
  
    // send height
    child.sendHeight();
    
  }, false);
});


