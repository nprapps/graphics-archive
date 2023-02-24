console.clear()

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");

var pymChild;
var { isMobile } = require("./lib/breakpoints");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

//Initialize graphic
var onWindowLoaded = function() {
  var series = window.DATA;
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};



var render = function(data) {
  
  var containerElement = document.querySelector(".graphic");
  var container = d3.select(containerElement);

  //run your D3 functions here

  // data
  var min = 10,
      max = 30000;

  var bubbleRange = [3,75];

  if (isMobile.matches) {
    console.log("true")
    bubbleRange = [3,60]
  }

  // scale size of circle to data
  var radius = d3
    .scaleSqrt()
    .domain([min, max])
    .range(bubbleRange);

  // select all countries (<p> from ai2html export)
  var countries = container.selectAll(".g-countries");

  // remove previous divs on resize
  countries.selectAll("div").remove();

   // append container and inner circle
  countries.append("div")
    .attr("class","container")    
    .append("div")
      .attr("class","inner")
      .attr("style",(d,i)=> {
        // use <p> text (country name) as key for data to get troop amounts
        var place = countries.select("p")._groups[0][i].innerText;
        // scale radius to amount of troops
        var r = Math.floor(radius(data[place]))        
        return ` \
        width: ${r}px; \
        height: ${r}px; \
        `
      })
      .on('mouseout', function (d,i) {
        d3.selectAll(".tip").classed("active",false);
      })      
      .on('mouseover', function (d,i) {
        
        var place = countries.select("p")._groups[0][i].innerText;
        var amount = data[place];        
        d3.selectAll(".tip").classed("active",false);
        d3.select(this).select(".tip").classed("active",true);
      }).append("div") 
          .attr("class","tip")
          .attr("style",(d,i)=> {
            var place = countries.select("p")._groups[0][i].innerText;
            var amount = data[place];
            var r = Math.floor(radius(data[place]))
            var style = `left: ${r}px;`
            if (place == "KAZAKHSTAN" || place == "GEORGIA" || place == "TURKEY") {
              var style = `right: ${r+100}px;`
            }
            return style;
          })
          .html((d,i)=>{
            var place = countries.select("p")._groups[0][i].innerText;
            var amount = data[place];          
            return `\
            <div class="title">${toTitleCase(place)}</div>\
            <div>${numberWithCommas(amount)} troops</div>\
            `
          })

  var legend = container.selectAll(".g-legend");
  
  // remove previous divs
  legend.selectAll("div").remove();

  legend.append("div")
    .attr("class","container")    
    .append("div")
      .attr("class","inner")
      .attr("style",(d,i)=> {        
        var place = legend.select("p")._groups[0][i].innerText;        
        var r = Math.floor(radius(data[place]))        
        return ` \
        width: ${r}px; \
        height: ${r}px; \
        `
      })
      .text((d,i)=> {
        var place = legend.select("p")._groups[0][i].innerText;        
        return `${data[place]/1000}k`
      })   

  // insert div scaled to 
    // remove any existing divs
    // add a new div 
  if (pymChild) {
    pymChild.sendHeight();
  }
};

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

function numberWithCommas(x) {
  if (x !== undefined) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } else {
    return
  }
    
}

// wait for images to load
window.onload = onWindowLoaded;
