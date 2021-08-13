var { getParameterByName } = require("./helpers");
var analytics = require("./analytics");

module.exports = new Promise(ok => {
  var url = "https://pym.nprapps.org/pym.v1.min.js";
  var script = document.createElement("script");
  script.src = url;
  document.head.appendChild(script);

  script.onload = function() {

    var child = new pym.Child();

    // child.onMessage("on-screen", function(bucket) {
    //   analytics.trackEvent("on-screen", bucket);
    // });
    // child.onMessage("scroll-depth", function(data) {
    //   data = JSON.parse(data);
    //   analytics.trackEvent("scroll-depth", data.percent, data.seconds);
    // });

    ok(child);
  }
});

switch (getParameterByName("mode")) {
  // Homepage (if someone clicked the "This code will be embedded
  // on the NPR homepage." checkbox when pulling the embed code.)
  case "hp":
  document.body.classList.add("hp");
  isHomepage = true;
  break;
  // Direct links to the child page (iOS app workaround link)
  case "childlink":
  document.body.classList.add("childlink");
  break;
};