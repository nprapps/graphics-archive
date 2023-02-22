var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

pym.then(child => {
    child.sendHeight();

    //cross out myth and fade in fact on scroll
    var observer = new IntersectionObserver(intersectionCallback, {threshold: 1});
    var target = document.querySelector(".target");
    observer.observe(target);
    function intersectionCallback(entries, observer){
      entries.forEach(entry=> {
        if(entry.isIntersecting){
          entry.target.classList.add("active");
        }
      })
    }

    // child.onMessage("on-screen", function(bucket) {
    //     ANALYTICS.trackEvent("on-screen", bucket);
    // });
    // child.onMessage("scroll-depth", function(data) {
    //     data = JSON.parse(data);
    //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    // });

    window.addEventListener("resize", () => child.sendHeight());
});
