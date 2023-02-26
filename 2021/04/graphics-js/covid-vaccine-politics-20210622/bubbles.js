console.clear();

var pym = require("./lib/pym");
var pymChild = null;
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints.js");
var { fmtComma } = require("./lib/helpers");
var { getQuants } = require("./util.js");
var $ = require("./lib/qsa");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-force/dist/d3-force.min.js"),
  ...require("d3-selection/dist/d3-selection.js"),
  ...require("d3-transition/dist/d3-transition.js")
};

var initialMode = "one";

var apMonths = ["Jan.","Feb.","March","April","May","June","July","Aug.","Sept.","Oct.","Nov.","Dec."];

var { sqrt, PI } = Math;
var { makeTranslate } = require("./lib/helpers");
var margin = null;

pym.then(child => {
  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", () => child.sendHeight());
});

var ignore = ["US", "IH2", "RP", "AS", "MP", "MH", "FM", "VI", "GU", "PR"];

// Filter by most recent date
var dates = [];
window.DATA.forEach(r => dates.push(r.date));
dates.sort();
var date = dates.slice(-1).pop();
var currentData = window.DATA.filter(r => r.date == date && r.population && ignore.indexOf(r.state) < 0);

currentData.forEach(
  function(r, i) {
    r.percentFirstDose = r.administered_dose1_pop_18plus;
    // r.percentFirstDose = (r.administered_dose1 / r.population) * 100;
    r.percentSecondDose = r.fully_vaccinated_18plus;
  }
);

// Update date in subhed
var month = apMonths[parseInt(date.split("-")[1]) - 1];
var day = parseInt(date.split("-")[2]);
document.querySelector(".date-subhed").innerHTML = month + " " + day;

var smallHeight = 50;
if (isMobile.matches) {
  smallHeight = 75;
}


// Bubbles
function renderChart(mode,size) {

  var dose = "percentFirstDose";
  // if (mode == "one") {
  // } else {
  //     dose = "percentSecondDose";
  // }

  var Y_FORCE = .03;
  var X_FORCE = 1;
  var COLLIDE_FORCE = 1;
  var MIN_RADIUS = 12;
  var MAX_RADIUS = isMobile.matches ? 75 : 100;
  var HIDE_TEXT = 6;
  var MIN_TEXT = 10;

  var ticksX = isMobile.matches ? 5 : 5;

  if (size == "small") {
    X_FORCE = 0.5;
    MIN_RADIUS = 0.5;
    MAX_RADIUS = isMobile.matches ? 7 : 7;
    ticksX = 5;
  }


  var svg = document.querySelector(".graphic svg.big");
  var chart = document.querySelector("#bubble-graphic");
  margin = {
    top: 17,
    bottom: 24,
    left:5,
    right:5
  }

  if (size == "small") {
    var svg = document.querySelector(".graphic svg.small");
    var chart = document.querySelector("#bubble-graphic-key");
    margin.top = 20;
    margin.bottom = 10;
    margin.left = 40;
    margin.right = 40;
  }

  svg.innerHTML = "";

  var chartElement = d3.select(svg)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  var chartWidth = chart.offsetWidth;
  var chartHeight = chartWidth / 3;
  svg.setAttribute("width", chartWidth);
  svg.setAttribute("height", chartHeight);

  // if (mode == "one") {
    svg.classList.add("one");
  // } else {
  //   svg.classList.remove("one");
  // }

  var xForce = d3.forceX().x(xAccess).strength(X_FORCE);
  var yForce = d3.forceY().strength(Y_FORCE);
  var collider = d3.forceCollide().strength(COLLIDE_FORCE);
  collider.radius(collisionRadius);

  var items = ["percentFirstDose","percentSecondDose"];

  // Set state colors
  // var quarts = {};
  //
  // items.forEach(item => {
  //   [firstQuart, secondQuart, thirdQuart] = getQuants(currentData.map(r => Number(r[item])));
  //   quarts[item] = {
  //     "firstQuart": firstQuart,
  //     "secondQuart": secondQuart,
  //     "thirdQuart": thirdQuart
  //   }
  // })

  var nodes = currentData.map(function(r) {
    var temp = {};
    items.forEach((item,i) => {
      var perc = item == "percentFirstDose" ? r.percentFirstDose : r.percentSecondDose;
      var {population, state} = r;
      var y = 1 - (population / maxPop) * 10000;
      var vy = 0;

      // var bucket = r[item] >= quarts[item].thirdQuart ? "bucket4" :
      //   r[item] >= quarts[item].secondQuart ? "bucket3" :
      //   r[item] >= quarts[item].firstQuart ? "bucket2" :
      //   r[item] >= 0 ? "bucket1" :
      //   "bucket0";

      var winner = KEY[state].winner_2020;
      var electoral = KEY[state].electoral;

      temp[item] = {
        y,
        vy,
        perc,
        population,
        state,
        // bucket,
        winner,
        electoral
      };
    })

    return {
      "percentFirstDose": temp["percentFirstDose"],
      "percentSecondDose": temp["percentSecondDose"]
    }
  });

  var xScale = {};
  var minmax = {};

  items.forEach(item => {

    var percentages = nodes.map(d => d[item].perc);
    var minPerc = Math.min(...percentages) - 1;
    var maxPerc = Math.max(...percentages) + 1;

    if (size == "small") {
      minmax[item] = [minPerc,maxPerc];
      minPerc = 0;
      maxPerc = 100;
    }

    xScale[item] = d3
      .scaleLinear()
      .domain([minPerc, maxPerc])
      .range([0, chartWidth-margin.right-margin.left]);
  })

  function xAccess(d) {
    return xScale[d.item](d.perc);
  }

  var pops = nodes.map(d => d["percentFirstDose"].population);
  var minPop = Math.min(...pops);
  var maxPop = Math.max(...pops);

  // var pops = nodes.map(d => d["percentFirstDose"].electoral);
  // var minPop = Math.min(...pops);
  // var maxPop = Math.max(...pops);

  function nodeRadius(d) {
    // var a = d.electoral / maxPop * (MAX_RADIUS**2);
    var a = d.population / maxPop * (MAX_RADIUS**2);
    var r = Math.sqrt(a / PI);
    return Math.max(r, MIN_RADIUS);
  }

  function collisionRadius(d) {
    return nodeRadius(d) + 1;
  }

  var simulationMaster = {};

  items.forEach(item => {
    var tempNodes = nodes.map(d =>  {
      d[item]["item"] = item;
      return d[item]
    });

    let simulation = d3.forceSimulation();
        simulation.alpha(5);
        simulation.alphaDecay(0.04);
        // simulation.stop(); // only run when visible

    simulation.force("x", xForce);
    simulation.force("y", yForce);
    simulation.force("collide", collider);

    simulation.nodes(tempNodes);
    simulation.tick(1000);

    simulationMaster[item] = simulation;
  })

  if (size == "small") {
    var maxDist = Math.max(...nodes.map(d => Math.abs(d["percentSecondDose"].y)));
  } else {
    var maxDist = Math.max(...nodes.map(d => Math.abs(d["percentFirstDose"].y)));
  }

  chartHeight = (maxDist * 2) + MAX_RADIUS + margin.bottom + margin.top;
  if (size == "small") {
    smallHeight = chartHeight - margin.top;
  }
  svg.setAttribute("height", chartHeight+5);


    // Create D3 axes.
    var xAxis = d3
      .axisTop()
      .scale(xScale[dose])
      .ticks(ticksX)
      .tickFormat(function(d) {
        return d.toFixed(0) + "%";
      });

    // Render axes to chart.

    chartElement
      .append("g")
      .attr("class", "x axis")
      .call(xAxis);

    if (size != "small") {
    // Render grid to chart.
    chartElement
      .append("g")
      .attr("class", "x grid")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxis.tickSize(chartHeight, 0, 0).tickFormat(""));
    }

    if (size == "small") {

      var rectDetails = [
        {
          "percentFirstDose":{
            min:0,
            max:xScale[dose](100)
          },
          "percentSecondDose":{
            min:0,
            max:xScale[dose](100)
          }
        },
        {
          "percentFirstDose":{
            min:xScale[dose](minmax.percentFirstDose[0])-5,
            max:xScale[dose](minmax.percentFirstDose[1])+5
          },
          "percentSecondDose":{
            min:xScale[dose](minmax.percentSecondDose[0])-5,
            max:xScale[dose](minmax.percentSecondDose[1])+5
          }
        },
      ]

      chartElement
        .append("g")
        .selectAll("rect")
        .data(rectDetails)
        .enter()
        .append("rect")
        .attr("class",(d,i)=>`bracket-rect i${i}`)
        .attr("x",d => d[dose].min)
        .attr("y",0)
        .attr("width",d => d[dose].max - d[dose].min)
        .attr("height",chartHeight-margin.top)
        .attr("rx",0)
    }

  // Add state circles
  chartElement
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append('circle')
    .attr("cx", d => d[dose].x)
    .attr("cy", d => d[dose].y + ((chartHeight-margin.top) / 2))
    .attr("r", d => nodeRadius(d[dose]))
    .attr("class", "state-circle")
    .attr("data-perc", d => d[dose].perc)
    .attr("data-state", d => d[dose].state)
    .attr("data-mode", mode)
    .attr("data-bucket", d => d[dose].bucket)
    .attr("data-winner", d => d[dose].winner);

  // Add state labels

  if (size != "small") {
    chartElement
      .append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append('text')
      .attr("x", d => d[dose].x)
      .attr("y", d => d[dose].y + ((chartHeight-margin.top) / 2) + (nodeRadius(d[dose])/2 * .35) + 1)
      .attr("font-size", d => Math.max(nodeRadius(d[dose])/9*5, MIN_TEXT) + "px")
      .attr("display", d => nodeRadius(d[dose])/2 < HIDE_TEXT ? "none" : "block")
      .attr("class", "state-text")
      .text(d => d[dose].state)


  }

  // Tooltips
  var tooltip = document.querySelector(".bubble-tooltip");

  function onMove(e) {
    var bounds = chart.getBoundingClientRect();
    var offsetX = e.clientX - bounds.left;
    var offsetY = e.clientY - 105;

    var state = e.target.getAttribute("data-state");
    var data = currentData.filter(d => d.state == state)[0];

    if (!state || !data) {
      return tooltip.classList.remove("show");
    }

    var percentFirstDose = data.percentFirstDose.toFixed(1);
    var percentSecondDose = data.percentSecondDose.toFixed(1);

    var doseBucket = e.target.getAttribute('data-bucket');
    var mode = e.target.getAttribute('data-mode');

    tooltip.innerHTML = `
    <div class="tooltip-label"><h3>${KEY[state].display_name || KEY[state].state_name}</h3></div>
    <div class="tooltip-label winner">2020 winner: <strong class="${KEY[state].winner_2020}">${KEY[state].winner_candidate} (${KEY[state].winner_2020})</strong></div>
    <div class="tooltip-label number one">At least one dose: <strong>${percentFirstDose}% of adults</strong></div>
    <div class="tooltip-label number">Population: <strong>${fmtComma(data.population)}</strong></div>`

    tooltip.classList.add("show");

    var left = offsetX < bounds.width / 2 ? offsetX + 10 : offsetX - 4 - tooltip.offsetWidth;
    tooltip.style.left = left + "px";
    tooltip.style.top = offsetY + 10 + "px";
  }

  if (!isMobile.matches && size !== "small") {
    chart.addEventListener("mousemove", onMove)
  }
}

renderChart(initialMode,"big");
renderChart(initialMode,"small");

window.addEventListener("resize", () => {
  renderChart("mode-one","big")
  renderChart("mode-one","small")
});

function changeMode(e,xScale,chartHeight,xAxis,nodeRadius) {
  var durationLength = 2000;
  var delayLength = 500;

  const HIDE_TEXT = 6;
  const MIN_TEXT = 10;

  // get right name
  var mode = e.target.value;

  var dose = "percentFirstDose";

  if (mode == "one") {} else {
      dose = "percentSecondDose";
  }

  // get xscale?
  var thisScale = xScale[dose];

  // transition axis
  var ticksX = isMobile.matches ? 5 : 5;

  xAxis =
    d3.axisTop()
    .ticks(ticksX)
    .scale(thisScale)
    .tickFormat(function(d) {
      return d.toFixed(0) + "%";
    });

  var svg1 = d3.select("svg.big")
  var svg2 = d3.select("svg.small")

  svg1.select(".x.axis")
   .transition().duration(durationLength)
   .call(xAxis);

  svg1.select(".x.grid")
    .transition().duration(durationLength)
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis.tickSize(chartHeight, 0, 0).tickFormat(""));

  // transition bubbles

  svg1.selectAll(".state-circle")
    .attr("data-mode", mode)
    .attr("data-bucket", d => {
      return d[dose].bucket
    });

  svg1.selectAll(".state-circle")
    .transition().duration(durationLength/2).delay(delayLength)
    .attr("cx", d => d[dose].x)
    .attr("cy", d => d[dose].y + (chartHeight / 2))
    .attr("data-perc", d => d[dose].perc);

  // transition state names
  svg1.selectAll(".state-text")
    .transition().duration(durationLength/2).delay(delayLength)
    .attr("x", d => d[dose].x)
    .attr("y", d => d[dose].y + (chartHeight / 2) + (nodeRadius(d[dose])/2 * .35) + 1)

  // move small bubbles

  svg2.selectAll(".bracket-rect")
    .transition().duration(durationLength/2).delay(delayLength)
    .attr("x",d => d[dose].min)
    .attr("width",d => d[dose].max - d[dose].min)

  svg2.selectAll(".state-circle")
    .attr("data-mode", mode)
    .attr("data-bucket", d => {
      return d[dose].bucket
    });
  svg2.selectAll(".state-circle")
    .transition().duration(durationLength/2).delay(delayLength)
    .attr("cx", d => d[dose].x)
    .attr("cy", d => d[dose].y + smallHeight/2)
    // .attr("cy", d => d[dose].y + (chartHeight / 2))
    .attr("data-perc", d => d[dose].perc);

  pymChild.sendHeight();
};
