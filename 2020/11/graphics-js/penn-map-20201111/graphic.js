	var pym = require("./lib/pym");
	require("./lib/webfonts");
	var { isMobile } = require("./lib/breakpoints");

	// console.clear();

	// DATA
	// geo data
	var geo_data = [];

	// var centered;
	// var path;
	// // var chartElement;
	// // var chartWrapper;
	// var maxTooltipWidth = 125;
	// // var chartWidth;
	// // var chartHeight;

	var pymChild;

	var {fmtComma, classify } = require("./lib/helpers");
	var d3 = {
	  ...require("d3-array/dist/d3-array.min"),
	  // ...require("d3-axis/dist/d3-axis.min"),
	  ...require("d3-scale/dist/d3-scale.min"),
	  ...require("d3-selection/dist/d3-selection.min"),
	  ...require("d3-geo/dist/d3-geo.min"),
	  ...require("d3-geo-projection/dist/d3-geo-projection.min"),
    ...require("d3-shape/dist/d3-shape.min"),
    ...require("d3-interpolate/dist/d3-interpolate.min")
	  // ...require("d3-transition/dist/d3-transition.min")
	};


	//Initialize graphic
	var onWindowLoaded = async function() {
	  var response = await fetch("./assets/pa_county.json");
    // var response = await fetch("./assets/precinct_426  .json");
	  // var response = await fetch("./assets/states_filtered.json");
	  
	  // var response = await fetch("./assets/worked/countries_filtered.json");
	  geo_data_pre = await response.json();

	  formatData();
	  render();

	  window.addEventListener("resize", render);

	  pym.then(child => {
	    pymChild = child;
	    child.sendHeight();
	  });
	};

	// formatData
	var formatData = function() {		
	  // join DATA to geo_data
    // console.log(DATA)
	  for(let i=0; i<geo_data_pre.features.length; i++) {
	    geo_data.push({
        ...geo_data_pre.features[i],
	     ...(DATA.find((itmInner) => itmInner.name === geo_data_pre.features[i].properties.NAME))
	    });
	  }
	}

	var render = async function() {
		var container = "#map-container";
	  var element = document.querySelector(container);
	  var width = element.offsetWidth;	

	  renderMap({
	    container,
	    width,
	    data: geo_data,
      places: PLACES,
      variableName: masterConfig.variableName,
      type: masterConfig.type
	  });

    // var container2 = "#map-container2";
    // var element2 = document.querySelector(container2);
    // var width2 = element2.offsetWidth;        
    // renderMap({
    //   container: container2,
    //   width: width2,
    //   data: geo_data,
    //   places: PLACES,
    //   variableName: "voteDiff",
    //   type: "upDown"
    // });

    // var container3 = "#map-container3";
    // var element3 = document.querySelector(container3);
    // var width3 = element3.offsetWidth;        
    // renderMap({
    //   container: container3,
    //   width: width3,
    //   data: geo_data,
    //   places: PLACES,
    //   variableName: "newTrump",
    //   type: "upDown"
    // });

    // var container4 = "#map-container4";
    // var element4 = document.querySelector(container4);
    // var width4 = element4.offsetWidth;        
    // renderMap({
    //   container: container4,
    //   width: width4,
    //   data: geo_data,
    //   places: PLACES,
    //   variableName: "newDem",
    //   type: "upDown"
    // });



	  // Update iframe
	  if (pymChild) {
	    pymChild.sendHeight();
	  }
	};

var renderMap = function(config) {  
  var aspectWidth = isMobile.matches ? 16 : 16;
  var aspectHeight = isMobile.matches ? 9 : 9;

  var margins = {
    top: 0,
    right: 0,
    bottom: 10,
    left: 0
  };

  var radiusMax = 25;
  var radiusMin = 1;

  var voteMarginMax = 100;

  var scaleVoteMaxSize = 100;

  if (isMobile.matches) {
    scaleVoteMaxSize = 50;
    voteMarginMax = 50;

  }

    var scaleVoteMargin = d3.scaleLinear()
    .domain([0,0.12])
    .range([0,voteMarginMax])

  var scaleVoteChange = d3.scaleLinear()
    .domain([0,70000])
    .range([0,scaleVoteMaxSize])

  var shadeScale = d3
    .scaleThreshold()
    .domain([0.5,.6,.7,0.8])    
    .range([
			"s40-50",
			"s50-60",
			"s60-70",
			"s70-80",
			"s80plus"
    ]);
    // .range([
    //   "#275e90",
    //   "#498dcb",
    //   "#adcdeb",
    //   "#f8b1ab",
    //   "#f05b4e",
    //   "#c52011",
    // ]);

  var line = d3
    .line()
    .curve(d3.curveCatmullRom.alpha(0.5))   

  // Mobile params
  if (isMobile.matches) {    
    radiusMax = 15;
  }

  // Calculate actual chart dimensions
  chartWidth = config.width - margins.left - margins.right;
  chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Create Robinson projection of world.
  // Move center down to compensate for Antarctica removed.
  var projection = d3.geoTransverseMercator()
    .translate([chartWidth / 2, chartHeight / 2]) // translate to center of screen
    .scale(config.width*10)
    .rotate([77 + 29 / 60, -40 - 52 / 60])

  path = d3.geoPath()
    .projection(projection); 

  // Create the root SVG element.
  chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  chartElement.append("svg:defs").append("svg:marker")
      .attr("id", "marker-positive")
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "-30")
      .attr("refX", function() {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
            .attr("d", "M0,0 L0,6 L6,3 z")
            .attr("fill","#D8472B")

chartElement.append("svg:defs").append("svg:marker")
      .attr("id", "marker-negative")
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "-150")
      .attr("refX", function() {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
            .attr("d", "M0,0 L0,6 L6,3 z")
            .attr("fill","#51AADE") 

  chartElement.append("svg:defs").append("svg:marker")
      .attr("id", "marker-positive2")
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .attr("refX", function() {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
            .attr("d", "M0,0 L0,6 L6,3 z")
            .attr("fill","#D8472B")

chartElement.append("svg:defs").append("svg:marker")
      .attr("id", "marker-negative2")
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .attr("refX", function() {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
            .attr("d", "M0,0 L0,6 L6,3 z")
            .attr("fill","#51AADE")                        

chartElement.append("svg:defs").append("svg:marker")
      .attr("id", "marker-up")
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .attr("refX", function() {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
            .attr("d", "M0,0 L0,6 L6,3 z")
            .attr("fill","#17807E")
          // .append("polyline")
          //   .attr("points","1 1, 9 5, 1 7")

            // <polyline points="1 1, 9 5, 1 7" />

chartElement.append("svg:defs").append("svg:marker")
      .attr("id", "marker-down")
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .attr("refX", function() {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
            .attr("d", "M0,0 L0,6 L6,3 z")
            .attr("fill","#E38D2C")                        


  // Render Map
  chartElement.selectAll(".states")
      // .data(casesData.sort(function(a, b) { 
      //   return a[mainProperty] - b[mainProperty];
      // }))
      .data(config.data)
      .enter().append("path")
      .attr("class", function(d){        
      	return `state ${classify(d.name)}`
      })
      .attr("d", path)

// Render infection bubbles and set up mouseover tooltips

  chartElement.selectAll("circle.bubble")
    .data(config.places)
    .enter()
    .append("circle")
    .attr("class","bubble")
    .attr("r",function(d){
      return 3;
    })
    .attr("transform", function(d) {

      return `translate(${projection([d.lon,d.lat])})`; 
    })




  if (config.type == "leftRight") {
    chartElement.selectAll("path.arrow")
      .data(config.data)
      .enter()
      .append("path")
      .attr("class",d => `arrow ${classify(d.county)} ${Math.sign(d[config.variableName]) == -1 ? "blue" : "red"}`)
      .attr("d", function(d){
        var centroid = projection(d3.geoCentroid(d))
        var shift = Math.sign(d[config.variableName])*scaleVoteMargin(Math.abs(d[config.variableName]));
        var xy1 = centroid;
        var xyMid = [centroid[0]+shift/2,centroid[1]+Math.abs(shift)/10]
        var xy2 = [centroid[0]+shift,centroid[1]-Math.abs(shift)/10]
        var arrPoints = [xy1,xyMid,xy2];
        return line(arrPoints)
      })
      .attr('marker-end', function(d){
        if (d.shift2020 > 0) {
          return `url(#marker-positive)`
        } else {
          return `url(#marker-negative)`
        }
        
      });
  } else {
    chartElement.selectAll("path.arrow")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class",d => `arrow ${classify(d.county)} ${Math.sign(d[config.variableName]) == -1 ? "orange" : "teal"}`)
    .attr("d", function(d){
      var centroid = projection(d3.geoCentroid(d))
      var shift = -1*Math.sign(d[config.variableName])*scaleVoteChange(Math.abs(d[config.variableName]));
      var arrFun = [];
      
      var xy1 = centroid;

      arrFun.push(xy1);
      // console.log(Math.round(shift / 10))
      // for (var i = 0; i < Math.abs(Math.round(shift / 10)); i++) {
      //   if (i % 2 == 1) {
      //     var plusminus = -1;
      //   } else {
      //     var plusminus = 1;
      //   }
      //   arrFun.push([centroid[0]+(plusminus),centroid[1]+(shift/10)*i])
      // }
      
      var xy2 = [centroid[0],centroid[1]+shift];
      arrFun.push(xy2);

      return line(arrFun);
    })
    .attr('marker-end', function(d){
      // console.log(d)
      // if (d[config.variableName] > 0) {
      //   return `url(#marker-up)`
      // } else {
      //   return `url(#marker-down)`
      // }
      if (config.variableName == "newDem") {
        return `url(#marker-negative2)`
      } else {
        return `url(#marker-positive2)`
      }
      
    });
  }

  chartElement.selectAll("text")
    .data(config.places)
    .enter()
    .append("text")
    .attr("class","placeName")
    .attr("transform", function(d) {      
      return `translate(${projection([d.lon,d.lat])})`; 
    })
    .attr("dy",d => `${10 + d.dy}px`)
    .attr("dx",function(d){
      if (d.name == "Philadelphia" && isMobile.matches) {
        return -10
      } else {
        return d.orientation == "left" ? "-8px" : "8px"
      }
      
    })
    .attr("text-anchor",d => d.orientation == "left" ? "end" : "start")
    .text(d => d.name)

}


// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;