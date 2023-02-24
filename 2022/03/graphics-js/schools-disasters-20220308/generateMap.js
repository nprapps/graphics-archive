console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS } = require("./lib/helpers");

var geoAlbersUsaTerritories = require("geo-albers-usa-territories");

var topojson = require("topojson-client/dist/topojson-client.min");

var districtsTopo = require("./data/school_districts_joined.json");
var statesTopo = require("./data/states_us.json");


var schoolDistricts = topojson.feature(districtsTopo,districtsTopo.objects["export_region"]);
var statesData = topojson.feature(statesTopo, statesTopo.objects["states_us"]);


var pymChild = null;
pym.then(function(child) {
  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", render);
});

var render = function() {
  var containerElement = document.querySelector(".graphic");
  //remove fallback
  containerElement.innerHTML = "";
  var containerWidth = containerElement.offsetWidth;

   var margins = {
    top: 5,
    right: 5,
    bottom: 5,
    left: 5
  };

  // Calculate actual chart dimensions
  var chartWidth = containerWidth - margins.left - margins.right;
  var chartHeight = chartWidth*.55; //global map aspect ratio


  var container = d3.select(containerElement);
  
  var svg = container.append("svg")
                        .attr("width", chartWidth + margins.left + margins.right)
                        .attr("height", chartHeight + margins.top + margins.bottom)
                        .append("g")
                        .attr("transform", `translate(${margins.left},${margins.top})`);

  //setup projection
  var projection = geoAlbersUsaTerritories.geoAlbersUsaTerritories()
                             .translate([chartWidth/2,chartHeight/2])
                             .scale(chartWidth*1.1)

  var path = d3.geoPath().projection(projection);

  var colorScale = d3.scaleOrdinal()
                      .domain(["grant","disaster-no-grant","neither"])
                      .range([
                        COLORS.red3,
                        COLORS.red5,
                        "#ccc"
                      ]);

  var statesFill = svg.append("g").selectAll(".states")
                        .data(statesData.features)
                        .enter()
                        .append("path")
                          .attr("class", "state")
                          .attr("d", path)
                          .attr("stroke", "none")
                          .attr('fill', "#ccc");

  var districts = svg.append("g")
                    .selectAll(".district")
                        .data(schoolDistricts.features)
                        .enter()
                        .append("path")
                          .attr("class", "district")
                          .attr("d", path)
                          .attr("stroke", "#fff")
                          .attr("stroke-width", "0.05")
                          .attr('fill', function(d){
                            var val;
                            var grant = d.properties["pa_or_rest"] == "Received PA or Restart Grant";
                            var disaster = d.properties["disaster_c"] == "LEA in county with declared disater";
                            if(grant){
                              val = "grant"
                            } else if(disaster){
                              val = "disaster-no-grant";
                            } else {
                              val = "neither";
                            }
                            return colorScale(val);
                          });

  var statesPath = svg.append("g").selectAll(".states")
                        .data(statesData.features)
                        .enter()
                        .append("path")
                          .attr("class", "state")
                          .attr("d", path)
                          .attr("stroke", "#fff")
                          .attr("stroke-width",0.25)
                          .attr('fill', "none");
                         

  pymChild.sendHeight();
};

//first render
render();
