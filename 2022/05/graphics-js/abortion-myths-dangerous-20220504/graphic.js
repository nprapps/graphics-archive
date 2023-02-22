// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var renderBarChart = require("./renderBars");

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = window.DATA;
  render(data);

  window.addEventListener("resize", () => render(data));

  pym.then(child => {
    pymChild = child;

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
    
    child.sendHeight();
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBarChart({
    container,
    width,
    data,
    labelColumn: "label",
    valueColumn: "amt"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;
