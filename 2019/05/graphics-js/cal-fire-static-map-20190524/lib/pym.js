var { getParameterByName } = require("./helpers");

module.exports = new Promise(ok => {
  var url = "https://pym.nprapps.org/pym.v1.min.js";
  var script = document.createElement("script");
  script.src = url;
  document.head.appendChild(script);

  script.onload = () => ok(new pym.Child({ polling: 250 }));
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

