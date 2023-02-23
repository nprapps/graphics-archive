var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var onWindowLoaded = function() {
  pym.then(child => {
      child.sendHeight();

      // child.onMessage("on-screen", function(bucket) {
      //     ANALYTICS.trackEvent("on-screen", bucket);
      // });
      // child.onMessage("scroll-depth", function(data) {
      //     data = JSON.parse(data);
      //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
      // });
      var i = 0;
      setInterval(function() {
        var ii = i % 4;

        document.querySelector(`.panel1_2 #g-ai1-0`).classList.remove("active");
        document.querySelector(`.panel1_2 #g-ai2-0`).classList.remove("active");
        document.querySelector(`.panel1_2 #g-ai3-0`).classList.remove("active");
        document.querySelector(`.panel1_2 #g-ai4-0`).classList.remove("active");
        var el = document.querySelector(`.panel1_2 #g-ai${ii+1}-0`);
        el.classList.add("active");


        i++;          
      }, 1000); // 60 * 1000 milsec

      window.addEventListener("resize", () => child.sendHeight());
  });
}

// wait for images to load
window.onload = onWindowLoaded;
