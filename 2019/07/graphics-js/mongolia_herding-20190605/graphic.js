console.clear()
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var aimag = require("./aimag_proc.geo.json")

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
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
  var containerWidth = container.offsetWidth;

  var container = d3.select(container);
  var svg = container.append("svg");
  console.log(aimag);

  var mongolia = DATA[0];
  console.log(mongolia);

  //calc min and max for pop

  var margins = {
    top: 20,
    right: 10,
    bottom: 50,
    left: 40
    };
  var chartWidth = containerWidth - margins.left - margins.right;
  var chartHeight = 500;

  var chartElement = svg.attr("width", containerWidth)
                        .attr("height", chartHeight + margins.top + margins.bottom)
                            .append("g")
                            .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  //put your D3 code here
    var xScale = d3.scaleLinear()
                    .domain([0,1])
                    .range([0, chartWidth-50]);

    var yScale = d3.scaleLinear()
                    .domain([1999,2018])
                    .range([0, 500]);

    var rScale = d3.scaleSqrt()
                    .domain([.25,.5])
                    .range([10,14]);

    //loop through years
    for(var y = 1999; y <= 2018; y++){

        //add overall proportion
        chartElement.append("circle")
                        .attr("cx", chartWidth - 25)
                        .attr("cy", yScale(y))
                        .attr("r", rScale(mongolia[`prop_herd${y}`]))
                        .attr("fill", "#bbb")
                        .attr("opacity", 0.5)

        //with label
        chartElement.append("text")
                        .attr("x", chartWidth - 32)
                        .attr("y", yScale(y)+5)
                        .text( (mongolia[`prop_herd${y}`]*100).toFixed() )
                        .attr("fill", "#999");

        //add axis line
        chartElement.append("rect")
                        .attr("x", 0)
                        .attr("y", yScale(y))
                        .attr("width", chartWidth-50)
                        .attr("height", 0.5)
                        .attr("fill", "#bbb");

        //add label
        chartElement.append("text")
                        .text(y)
                        .attr("x", -35)
                        .attr("y", yScale(y) + 5)
                        .attr("fill", "#555");

        //draw circles
        for(var a of aimag.features){
           
            var name = a.properties["ADM1_EN"];
            
            chartElement.append("circle")
                  .attr("cx", function(d){
                    return xScale(+a.properties[`herder_prop${y}`]);
                  } )
                  .attr("cy", function(d){
                    return yScale(y);
                  })
                  .attr("r", function(d){
                    var r = rScale(+a.properties[`total_pop${y}`].replace(/,/g, ""));
                    r = 4;
                    return r;
                  })
                  .attr("fill", "blue")
                  .attr("fill-opacity", 0.5);


        }
    }




  pymChild.sendHeight();
};

//first render
render();