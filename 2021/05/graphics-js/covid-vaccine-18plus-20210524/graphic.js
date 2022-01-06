console.clear();

var pym = require("./lib/pym");
require("./lib/webfonts");

var { getQuants } = require("./util.js");
var { COLORS, classify, fmtComma } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");
//var tooltip = $.one(".tooltip")

var apMonths = [
  "Jan.",
  "Feb.",
  "March",
  "April",
  "May",
  "June",
  "July",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec."
];

// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))

// Find most recent date
var dates = [];
window.DATA.forEach((r) => dates.push(r.date));
dates.sort();
var date = dates.slice(-1).pop();
var currentData = window.DATA.filter((r) => r.date == date);

// var initialMode = "both";
var initialMode = "both";
var svg = document.querySelector("svg");

currentData.forEach(function (r, i) {
  r.percentFirstDose = r.administered_dose1_pop_18plus;
  r.percentSecondDose = r.fully_vaccinated_18plus
});

var states = {};
currentData.forEach(function (r) {
  if (!states[r.state_name]) {
    states[r.state_name] = {
      ap: r.state,
      short: window.KEY[r.state].abbreviation
    }
  }
});

Object.keys(states).forEach(function(name) {
  var stateElement = $.one(`.state-${name.replace(/ /g, "-").toLowerCase()}`);
  if (!stateElement) return;
  var r = states[name];
  // Add state labels
  var ns = stateElement.namespaceURI;
  var stateCoords = stateElement.getBBox();
  var stateLabel = document.createElementNS(ns, "text");
  svg.appendChild(stateLabel);
  stateLabel.textContent = r.ap;
  var labelCoords = stateLabel.getBBox();
  stateLabel.setAttribute("x", stateCoords.x + stateCoords.width / 2 + 1);
  stateLabel.setAttribute("y", stateCoords.y + stateCoords.height / 2 + 5);
  stateLabel.setAttribute("class", "state-label");

  // Add mobile labels
  var mobileLabel = document.createElementNS(ns, "text");
  svg.appendChild(mobileLabel);
  mobileLabel.textContent = r.short;
  var mobileCoords = mobileLabel.getBBox();
  mobileLabel.setAttribute("x", stateCoords.x + stateCoords.width / 2 + 1);
  mobileLabel.setAttribute("y", stateCoords.y + stateCoords.height / 2 + 5);
  mobileLabel.setAttribute("class", "state-label mobile-label");
});

$(".states path").forEach((el) => {
  el.addEventListener("mouseenter", mouseEnterFunction);
  el.addEventListener("mousemove", mouseMoveFunction);
  el.addEventListener("mouseout", mouseOutFunction);
});


pym.then((child) => {
  child.sendHeight();
  window.addEventListener("resize", () => {
    child.sendHeight();
    renderMap(currentData, initialMode);
  });
});

// Update date in subhed
var month = apMonths[parseInt(date.split("-")[1]) - 1];
var day = parseInt(date.split("-")[2]);
document.querySelector(".date-subhed").innerHTML = month + " " + day;

var tooltip = $.one(".tooltip");
var mapContainer = $.one("svg");

var maxTooltipWidth = 200;

renderMap(currentData, initialMode);

// Select SVG element

function renderMap(currentData, mode) {
  var dose = mode == "both" ? "percentSecondDose" : "percentFirstDose";

  firstQuart = 40;
  secondQuart = 50;
  thirdQuart = 60;

  // [firstQuart, secondQuart, thirdQuart] = getQuants(
  //   currentData.map((r) => Number(r[dose]))
  // );

  // Update bucket ranges in legend
  document.querySelector(".label1").innerHTML = firstQuart + "%";
  document.querySelector(".label2").innerHTML = secondQuart + "%";
  document.querySelector(".label3").innerHTML = thirdQuart + "%";

  currentData.forEach(function (r) {
    var stateClassName = r.state_name.replace(/ /g, "-").toLowerCase();
    var stateElement = document.querySelector(".state-" + stateClassName);
    if (!stateElement) return;

    r.abbreviation = window.KEY[r.state].abbreviation || r.state_name;

    // Set state colors
    var bucket =
      r[dose] >= thirdQuart
        ? "bucket4"
        : r[dose] >= secondQuart
        ? "bucket3"
        : r[dose] >= firstQuart
        ? "bucket2"
        : r[dose] >= 0
        ? "bucket1"
        : "bucket0";

    stateElement.setAttribute("data-bucket", bucket);
    stateElement.setAttribute("data-mode", mode);
    $(".swatch").forEach(function (s) {
      s.setAttribute("data-mode", mode);
    });
  });
}

function mouseEnterFunction() {
  if (isMobile.matches) return;
  this.parentElement.appendChild(this);
  // d3.select(this).moveToFront();
  var class_name = this.className.baseVal.replace("state-", "");

  var state_check = class_name.replaceAll("-", " ");
  var data = currentData.filter(
    (d) => d.state_name.toLowerCase() == state_check
  );
  var {
    state,
    state_name,
    population,
    percentFirstDose,
    percentSecondDose
  } = data[0];

  var percentFirstDose = percentFirstDose.toFixed(1);
  var percentSecondDose = percentSecondDose.toFixed(1);

  var doseBucket = this.getAttribute("data-bucket");
  var mode = this.getAttribute("data-mode");

  if (mode == "one") {
    tooltip.innerHTML = `
            <div class="tooltip-label"><h3>${
              KEY[state].display_name || state_name
            }</h3></div>
            <div class="tooltip-label number both">Fully vaccinated: <strong>${percentSecondDose}%</strong></div>
            <div class="tooltip-label number one">At least one dose: <span id="dose" data-bucket="${doseBucket}" data-mode="${mode}">${percentFirstDose}%</span></div>
            <div class="tooltip-label number">Population: <strong>${fmtComma(
              population
            )}</strong></div>`;
  } else {
    tooltip.innerHTML = `
            <div class="tooltip-label"><h3>${
              KEY[state].display_name || state_name
            }</h3></div>
            <div class="tooltip-label number both">Fully vaccinated: <span id="dose" data-bucket="${doseBucket}" data-mode="${mode}">${percentSecondDose}%</span></div>
            <div class="tooltip-label number one">At least one dose: <strong>${percentFirstDose}%</strong></div>
            <div class="tooltip-label number">Population: <strong>${fmtComma(
              population
            )}</strong></div>`;
  }
}

function mouseMoveFunction(e) {
  if (isMobile.matches) return;
  var { clientX, clientY } = e;
  //console.log(this)

  var bodyPos = document.querySelector("body").getBoundingClientRect();
  var mapPos = mapContainer.getBoundingClientRect();
  var offsetX = (bodyPos.width - mapPos.width) / 2;

  var statePos = this.getBoundingClientRect();

  tooltip.style.top = statePos.top - 50 + "px";

  if (statePos.bottom > mapPos.bottom - 120) {
    tooltip.style.top = statePos.top - 210 + "px";
  }
  //var element = tooltip.node();
  var tooltipLeft = statePos.left + statePos.width / 2 - offsetX;
  // console.log(tooltipLeft, (tooltipLeft + maxTooltipWidth), (mapPos.right - offsetX - maxTooltipWidth));
  if (tooltipLeft >= mapPos.right - offsetX - maxTooltipWidth) {
    // console.log("too wide")
    tooltipLeft = tooltipLeft - maxTooltipWidth;
  }
  tooltip.style.left = tooltipLeft + "px";

  tooltip.style.display = "block";
}

function mouseOutFunction() {
  tooltip.style.display = "none";
}

function changeMode(e) {
  renderMap(currentData, e.target.value);
}

// document.querySelector(".controls").addEventListener("change", changeMode);
