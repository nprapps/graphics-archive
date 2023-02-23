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
      // var i = 0;
      // setInterval(function() {
      //   var ii = i % 2;
        // var el = document.querySelector(`.panel2 #g-_age-graphic-panel2_1`);

        
        // document.querySelector(`.panel2 #g-_age-graphic-panel2_1`).classList.remove("active");
        // document.querySelector(`.panel2 #g-_age-graphic-panel2_2`).classList.remove("active");
        // var el = document.querySelector(`.panel2 #g-_age-graphic-panel2_${ii+1}`);        
        // el.classList.add("active");

        // document.querySelector(`.panel3 #g-_age-graphic-panel3_1`).classList.remove("active");
        // document.querySelector(`.panel3 #g-_age-graphic-panel3_2`).classList.remove("active");
        // var el = document.querySelector(`.panel3 #g-_age-graphic-panel3_${ii+1}`);        
        // el.classList.add("active");


      //   i++;          
      // }, 2000); // 60 * 1000 milsec

      window.addEventListener("resize", () => child.sendHeight());
  });
}

// wait for images to load
window.onload = onWindowLoaded;
