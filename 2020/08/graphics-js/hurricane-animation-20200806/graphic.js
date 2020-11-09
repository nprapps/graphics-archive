var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
// var renderBoats = require("./renderBoats");
var timeStep = require("./timestep");

// var startTime = new Date('5/25/18 1:00 AM UTC-0800');
// var endTime = new Date('5/26/18 11:59 UTC-0800');
var stepLength = 100;
var ooo = 0;  
// var totalMinutes = 10;
// var totalMinutes = 70;
// var stepLength = 50;


// var play = function(){
//   console.log('hello')
//   return;
// }





var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
  ...require("d3-timer/dist/d3-timer.min")
};

//Initialize graphic
var onWindowLoaded = async function () {

  // var [vessels] = await Promise.all([getPaths()]);

  // Add in the vessel data ...
  // var series = formatData(window.DATA);
  // render(series);

// let options = {
//   // root: document.querySelector('body'),
//   rootMargin: '0px',
//   threshold: 1.0
// }

// let callback = (entries, observer) => {
//   entries.forEach(entry => {
//     console.log(entry.isIntersecting)
//     if (entry.isIntersecting && ooo === 0) {
//       ooo++;
//       render(data);
//     }
//   });
// };

// let observer = new IntersectionObserver(callback, options);


//   let target = document.querySelector('#sub-graphic1');
//   observer.observe(target);

  var data = window.DATA; 
  render(data);
  

  window.addEventListener("resize", function(){
    if (pymChild) {
      pymChild.sendHeight();
    }
  });

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // d3.timeout(() => t.stop(),0)

  d3.selectAll(`.eyes`).classed("active",false)

  // Render the boats!  
  var container = "#graphic";
  var element = document.querySelector(container);
  
  var width = element.offsetWidth;    
  var lengthOfTime = (DURATION*stepLength)-(6*stepLength);

  var t;

  // start it the initial time
  d3.select("button").classed("playing",true)
  d3.select(".pause").classed("show",true)
  d3.select(".play").classed("show",false)

  d3.select("button").on("click", function(d){
    if (d3.select(this).classed("playing")) {
      // pause

      t.stop();  
      d3.select(this).classed("playing",false)
      d3.select(".play").classed("show",true)
      d3.select(".pause").classed("show",false)
    } else {
      // console.log('trigger a play')
      if (!d3.select(".replay").classed("show")) {
        // pause 

      } else {
        // restart at beginning
        d3.selectAll(".annotation").classed("active",false)
        d3.selectAll(`.eyes`).classed("active",false)

        // d3.timeout(function(){
        //   t.stop();    
        //   restarter();
        // }, lengthOfTime);
      }
      

      
      t = d3.interval(stepMaster,stepLength);
      
      d3.select(this).classed("playing",true)
      d3.select(".play").classed("show",false)
      d3.select(".replay").classed("show",false)
      d3.select(".pause").classed("show",true)
    }
    
  })


  var ii=0;
  var jj=0;

  t = d3.interval(stepMaster, stepLength)

  // d3.timeout(() => t.stop(), (10000))

  function restarter(){
    ii = 0;
    d3.select("button").classed("playing",false)
    d3.select(".pause").classed("show",false)
    d3.select(".replay").classed("show",true)
    // console.log("----------------")

  }

  function stepMaster(elapsed){
    timeStep({
      elapsed,
      data,
      stepLength,
      ii
    });

    if (data[ii].duration-1 > jj) {
      jj++      
    } else {
      ii++  
      jj = 0;
    }
    // console.log(ii)
    if (ii >= data.length - 7) {
      t.stop();
      restarter();
    }
    
  }


  // stop at end
  // d3.timeout(function(){
  //   t.stop();    
  //   restarter();
  // }, lengthOfTime);
  
  // render(data)
  // console.log('hello world')

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
