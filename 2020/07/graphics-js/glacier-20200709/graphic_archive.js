var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
// var renderBoats = require("./renderBoats");
var moveBoats = require("./moveBoats");
var bigBoats = ["NOORDAM","ISLAND PRINCESS"];
var skipBoats = [""];
var startTime = new Date('5/25/18 1:00 AM UTC-0800');
var endTime = new Date('5/26/18 11:59 UTC-0800');
var secondLength = 50;
// var totalMinutes = 10;
var totalMinutes = 70;
// var secondLength = 50;

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
  ...require("d3-timer/dist/d3-timer.min")
};

var getPaths = async function () {
  var response = await fetch('./assets/vessels.min.json');
  return response.json();
};

//Initialize graphic
var onWindowLoaded = async function () {

  var [vessels] = await Promise.all([getPaths()]);

  // Add in the vessel data ...
  // var series = formatData(window.DATA);
  // render(series);
  render(vessels);

  // window.addEventListener("resize", () => render());

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the boats!  
  var container = "#paths";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  // var boats = renderBoats({
  //   container,
  //   width,
  //   data,
  //   bigBoats,
  //   skipBoats
  // });

  var containerElement = d3.select(container).select("svg");
  var polyline = containerElement.selectAll("polyline");    
  var boats = containerElement.append("g");

  boats.selectAll("circle")
    .data(polyline._groups[0])
    .enter()
    .append("circle")
    .attr("class",d => `boat ${d.classList[1]}`)
    .attr("cy",d => d.points[10].y)
    .attr("cx",d => d.points[10].x)
    .attr("r",15)

  var ii=0;
  var t = d3.interval(function(elapsed){
      moveBoats({
        elapsed,
        startTime,
        boats,
        data,
        secondLength,
        ii
      });
  }, secondLength)

  console.log(startTime)
  d3.timeout(() => t.stop(), (totalMinutes*secondLength))
  


  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
