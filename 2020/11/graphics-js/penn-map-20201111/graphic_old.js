var pym = require("./lib/pym");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var processDATA = require("./process-data.js");

console.clear();

var processed = processDATA(window.territories, window.countries);
window.processed = processed;

// DATA
// geo data
var geo_data = [];
var mainProperty = "confirmed";
var mainPropertyOverride = "confirmed_override";
var deathProperty = "deaths";
var deathPropertyOverride = "deaths_override";
var nameProperty = "name_display";

var centered;
var path;
var chartElement;
var chartWrapper;
var maxTooltipWidth = 125;
var chartWidth;
var chartHeight;

var pymChild;

var {fmtComma } = require("./lib/helpers");
var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-geo-projection/dist/d3-geo-projection.min"),
  // ...require("d3-transition/dist/d3-transition.min")
};

//Initialize graphic
var onWindowLoaded = async function() {

  var response = await fetch("./assets/worked/countries_filtered.json");
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
  for(let i=0; i<geo_data_pre.features.length; i++) {
    geo_data.push({
     ...geo_data_pre.features[i], 
     ...(processed.find((itmInner) => itmInner.name_geo === geo_data_pre.features[i].properties.NAME))}
    );
  }
}

var isPlural = function(d) {
  if (d == 1) {
    return "";
  } else {
    return "s";
  }
}

var labelSide = function(d) {
  if (d == "right") {
    return 1;
  } else {
    return -1;
  }
}

var render = async function() {
  var container = "#map-container";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  renderMap({
    container,
    width,
    data: geo_data
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }

};

var renderMap = function(config) {
  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 30,
    right: 0,
    bottom: 10,
    left: 0
  };

  var radiusMax = 25;
  var radiusMin = 1;

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
  var projection = d3.geoRobinson()
    .translate([chartWidth / 2, chartHeight / 2]) // translate to center of screen
    .scale(config.width/ 1.1)
    .center([15, 50]);

  path = d3.geoPath()
    .projection(projection); 

  // Get max and min of mainProperty for circle creation.
  var values = config.data
    .map(d => d[mainProperty] || 0);
  var max = Math.max(...values);

  var radius = d3.scaleSqrt()
      .domain([0, max])
      .range([radiusMin, radiusMax]); 

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

  var casesData = config.data.filter(function(a) {
      return !isNaN(a[mainProperty]);
    });
  var noCasesData = config.data.filter(function(a) {
      return isNaN(a[mainProperty]);
    });

  chartElement.selectAll(".countries")
      .data(noCasesData)
      .enter().append("path")
      .attr("class", "country")
      .attr("d", path);

  // Render Map
  chartElement.selectAll(".countries")
      .data(casesData.sort(function(a, b) { 
        return a[mainProperty] - b[mainProperty];
      }))
      .enter().append("path")
      .attr("class", "country on")
      .attr("d", path);

  // add in tooltip for individual country display.
  var tooltip = d3.select("#map-container")
    .append("div")
    .attr("id", "country-tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "#fff")
    .text("");
  var mainTooltipLabel = tooltip.append("div")
    .attr("class", "label main");
  var secondaryTooltipLabel = tooltip.append("div")
    .attr("class", "label secondary cases");
  var deathsTooltipLabel = tooltip.append("div")
    .attr("class", "label secondary deaths");

  // Render infection bubbles and set up mouseover tooltips
  chartElement.selectAll("circle.bubble")
    .data(casesData.sort(function(a,b) {
      return b[mainProperty] - a[mainProperty];
    }))
    .enter()
    .append("circle")
    .attr("class","bubble")
    .attr("r",function(d){    
      if (d[mainProperty] && d[mainProperty] > 0) { 
        return radius(d[mainProperty]);        
      }
    })
    .attr("transform", function(d) { 
      return `translate(${getCenter(d, projection)})`; 
    })
    .on("mouseover", function(d){
      // Don't do tooltips on mobile.
      if (isMobile.matches) {
        return;
      }
      var radius = parseInt(this.getAttribute("r"));

      mainTooltipLabel.text(d[nameProperty]); 
      secondaryTooltipLabel.text(getLabelText(d, "case", mainProperty, mainPropertyOverride));
      deathsTooltipLabel.text(getLabelText(d, "death", deathProperty, deathPropertyOverride));

      // set tooltip positions. If tooltip too far to the right, move
      // to righthand side of country.
      var element = d3.select('#country-tooltip').node();
      var tooltipWidth = element.getBoundingClientRect().width;
      var center = getCenter(d, projection);
      tooltip.style("top", center[1] + "px");
      var offset = center[0] + 5 + radius;
      if (offset >= chartWidth - maxTooltipWidth) {
        offset = center[0] - 5 - radius - tooltipWidth;
      }
      tooltip.style("left", offset + "px");
  
      return tooltip.style("visibility", "visible");
    })
    .on("mouseout", function(){return tooltip.style("visibility", "hidden")});

  var textGroups = chartElement.selectAll("g.labelGroup")
    .data(config.data.filter(d => d.label == true))
    .enter()
    .append("g")
    .attr("class","labelGroup")
    .attr("transform", function(d) { 
      return `translate(${getCenter(d, projection)})`
    })

  textGroups
    .append("text")
    .attr("class","label main")    
    .attr("dy", 5)
    .attr("dx", d => (radius(d[mainProperty]) + d.label_offsetX)*labelSide(d.labelSide))
    .attr("text-anchor", d => d.labelSide == "right" ? "start" : "end")
    .text(d => d[nameProperty]);

  textGroups
    .append("text")
    .attr("class","label secondary cases")
    .attr("dy", 20)
    .attr("dx", d => (radius(d[mainProperty]) + d.label_offsetX)*labelSide(d.labelSide))
    .attr("text-anchor", d => d.labelSide == "right" ? "start" : "end")
    .text(function(d){
      return getLabelText(d, "case", mainProperty, mainPropertyOverride);
    });

  textGroups
    .append("text")
    .attr("class","label secondary deaths")    
    .attr("dy", 35)
    .attr("dx", d => (radius(d[mainProperty]) + d.label_offsetX)*labelSide(d.labelSide))
    .attr("text-anchor", d => d.labelSide == "right" ? "start" : "end")
    .text(function(d){
        return getLabelText(d, "death", deathProperty, deathPropertyOverride);
    })

  textGroups
    .append("line")
    .attr("class","annoLine")
    .attr("x1",d => (radius(d[mainProperty]) + d.label_offsetX - 3 )*labelSide(d.labelSide))
    .attr("x2",d => (radius(d[mainProperty]) + 3)*labelSide(d.labelSide))
    .attr("y1",0)
    .attr("y2",0);

};

function getLabelText(data, label, prop, overrideProp) {
  var number = data[overrideProp] > data[prop] ? data[overrideProp] : data[prop];

  return `${fmtComma(number)} ${label}${isPlural(number)}`
}

// Gets the center for an geography.
function getCenter(d, projection) {
  var center = projection(d3.geoCentroid(d));

  // Necessary special cases for US and Canada
  if (d[nameProperty] == "France") {
    center[0] = center[0] + chartWidth * .12;
    center[1] = center[1] - chartWidth * .05;
  }

  if (d[nameProperty] == "Russia") {
    center[0] = center[0] - chartWidth * .5;
    center[1] = center[1] + chartWidth * .1;
  }

  if (d[nameProperty] == "Norway") {
    center[0] = center[0] - chartWidth * .05;
    center[1] = center[1] + chartWidth * .1;
  }

  return center;
}

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;