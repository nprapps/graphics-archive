console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min")
};

var onWindowLoaded = function() {
  pym.then(child => {
      child.sendHeight();

      child.onMessage("on-screen", function(bucket) {
          ANALYTICS.trackEvent("on-screen", bucket);
      });
      child.onMessage("scroll-depth", function(data) {
          data = JSON.parse(data);
          ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
      });

      window.addEventListener("resize", function(){ 

        setImgs();
        child.sendHeight();
        window.setTimeout(function(){
          child.sendHeight();
        },1500)


      });
  });
}



var setImgs = function() {

        var element = document.querySelector('body');
        var width = element.offsetWidth;
        var imgSrc = d3.select("img").attr('src')

        if (width <= 399) {

          d3.select('img')
          .attr("src", function(){
            console.log(imgSrc)
            console.log('set src')
            if (imgSrc.indexOf("mobile") == -1) {
               console.log('doenst ahve mobile')
                return imgSrc.split(".")[0] + "-mobile.png"
            }
            else {
              return imgSrc
            }
          })

        }

        else {
          console.log('not mobile')
          console.log(imgSrc)
          d3.select('img')
          .attr("src", function(){
            if (imgSrc.indexOf("mobile") > -1) {
              return imgSrc.replace("-mobile", "")
            }
            else {
              return imgSrc
            }
          })
        }

}

setImgs();



// wait for images to load
window.onload = onWindowLoaded;
