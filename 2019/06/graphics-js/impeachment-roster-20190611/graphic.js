var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var pymChild;

pym.then(child => {
  pymChild = child;
  child.sendHeight();

  child.onMessage("on-screen", function(bucket) {
    ANALYTICS.trackEvent("on-screen", bucket);
  });
  child.onMessage("scroll-depth", function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });

  window.addEventListener("resize", () => child.sendHeight());
});

var $ = require("./lib/qsa");
$(".stance-list li").forEach(function(element) {
  var button = $.one(".reveal-statement", element);
  button.addEventListener("click", function() {
    element.classList.toggle("expanded");
    if (pymChild) pymChild.sendHeight();
  });
});

$(".stance-list ul").forEach(function(ul) {
  var button = document.createElement("div");
  button.classList.add("show-all")
  button.innerHTML = "Show all &#9660;";
  var hidden = $("li:nth-child(n + 10)", ul);
  if (!hidden.length) return;
  hidden.forEach(el => el.style.display = "none");
  button.addEventListener("click", function() {
    hidden.forEach(el => el.style.display = "");
    ul.removeChild(button);
    if (pymChild) pymChild.sendHeight();
  });
  ul.appendChild(button);
});
