console.clear();
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var aimag = require("./aimag_proc.geo.json");
var pop = require("./pop.geo.json");


var { COLORS, wrapText} = require("./lib/helpers");
var d3 = {
  ...require("d3/dist/d3.min"),
  ...require("d3-geo-projection/dist/d3-geo-projection.min")
};

var pymChild = null;
pym.then(function(child) {

  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", render);

  child.onMessage("on-screen", function(bucket) {
    ANALYTICS.trackEvent("on-screen", bucket);
  });
  child.onMessage("scroll-depth", function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });

});

var render = function() {

  var container = document.querySelector(".graphic");
  //remove fallback
  container.innerHTML = "";

  var aspectWidth = 4;
  var aspectHeight = 3;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 30
  };

  var w = container.offsetWidth - margins.left - margins.right;
  var h =
    Math.ceil((container.offsetWidth * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;


  var $container = d3.select(container);

  //add buttons

  $container.append("p")
        .attr("class", "button")
        .html("1991")
        .on("click", reverseMigrate);

   //add buttons
  $container.append("p")
        .attr("class", "button")
        .html("2018")
        .on("click", migrate);



  var svg = $container.append("svg")
                        .attr("width", w)
                        .attr("height", h);
  

//map params
  var parallel_one = 43.24696;
  var parallel_two = 50.46391;

  var center = [103.84277,46.855435];

  //to generate map
 var mongoliaAlbers = d3.geoConicEqualArea()
                .parallels([parallel_one, parallel_two])
                .rotate([-center[0],0,0])
                .scale(w*2.5)
             //   .fitSize([w, h], park.geometry)
                .center([0,center[1]])
                .translate([w/2,h/2]);

  var path = d3.geoPath()
      .projection(mongoliaAlbers);

  var scaleFactor = 6;
  var ulaanbaatar = [ 107.165424322027889, 47.915530204317932 ];

  svg.selectAll(".aimag")
      .data(aimag.features)
      .enter()
      .append("path")
          .attr("d", path)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5)
          .attr("fill","#ddd");


var pMin = 3;
function flannery(value){
  return 1.0083 * Math.pow((value/0.5495172271),0.5716) * pMin;
}


//add before circles
  svg.selectAll(".today")
       .data(pop.features)
       .enter()
       .append("circle")
          .attr("class", function(d){
            return d.properties["ADM1_EN"] + " total";
          })
          .attr("cx", function(d){
            return mongoliaAlbers(d.geometry.coordinates)[0];
          })
          .attr("cy", function(d){
            return mongoliaAlbers(d.geometry.coordinates)[1];
          })
          .attr("r", function(d){
            //return Math.sqrt(d.properties["perc_1991"])*scaleFactor;
            return flannery(d.properties["perc_1991"]);
          })     
          .attr("fill", COLORS.teal3)
           .attr("stroke", "#fff")
           .attr("stroke-width", 1)
          .attr("fill-opacity", 1);


//filter to just those who've lost
var loss = pop.features.filter(a => a.properties["perc_1991"] > a.properties["perc_2018"]);
console.log(loss);

//add difference circles
   svg.selectAll(".loss")
       .data(loss)
       .enter()
       .append("circle")
          .attr("class", function(d){
            return d.properties["ADM1_EN"]+ " loss";
          })
          .attr("cx", function(d){
            return mongoliaAlbers(d.geometry.coordinates)[0];
          })
          .attr("cy", function(d){
            return mongoliaAlbers(d.geometry.coordinates)[1];
          })
          .attr("r", function(d){
              var diff = d.properties["perc_1991"] - d.properties["perc_2018"];
              //return Math.sqrt(diff)*scaleFactor;
              return flannery(diff);
          })     
          .attr("fill", COLORS.teal3)
          .attr("fill-opacity", 1);

  function migrate(){
  //move circles to ulaanbaatar
    d3.selectAll(".loss").transition("moveUb").duration(3000)
      .attr("cx", mongoliaAlbers(ulaanbaatar)[0])
      .attr("cy", mongoliaAlbers(ulaanbaatar)[1]);

  //transition circle size
    d3.selectAll(".total").transition("rescale")
      .duration(function(d){
        if(d.properties["ADM1_EN"] == "Ulaanbaatar") return 3000;
        else return 1000;
      })
      .delay(function(d){
        if(d.properties["ADM1_EN"] == "Ulaanbaatar") return 500;
        else return 0;
      })
      .attr("r", function(d){
            //return Math.sqrt(d.properties["perc_2018"])*scaleFactor;
            return flannery(d.properties["perc_2018"]);
          });
  }

  function reverseMigrate(){
  //move circles back to position
    d3.selectAll(".loss").transition("moveUb").duration(3000)
      .attr("cx", function(d){
            return mongoliaAlbers(d.geometry.coordinates)[0];
          })
          .attr("cy", function(d){
            return mongoliaAlbers(d.geometry.coordinates)[1];
          })

  //transition circle size
    d3.selectAll(".total").transition("rescale")
      .duration(function(d){
        if(d.properties["ADM1_EN"] == "Ulaanbaatar") return 2000;
        else return 2000;
      })
      .delay(function(d){
        if(d.properties["ADM1_EN"] != "Ulaanbaatar") return 1500;
        else return 0;
      })
      .attr("r", function(d){
            //return Math.sqrt(d.properties["perc_1991"])*scaleFactor;
            return flannery(d.properties["perc_1991"]);
          });
  }



  pymChild.sendHeight();
};

//first render
render();