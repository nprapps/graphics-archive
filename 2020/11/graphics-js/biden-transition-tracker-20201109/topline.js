console.clear();

var pym = require("./lib/pym");
var $ = require("./lib/qsa");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var template = require("./listTemplate.js");

async function init() {
    // if (window.location.hostname == "apps.npr.org") {
        var request = await fetch("https://apps.npr.org/dailygraphics/data/sheets/biden-transition-tracker-20201109.json");
        var copy = await request.json();
        var positions = copy.data.filter(d => !d.hide);
        
        var confirmedList = [];
        var confirmed = 0;
        var needed = 0;
        positions.forEach(function(r) {
          if (r.hide) return;
          if (r.status == "Confirmed") { 
            confirmed += 1;
            confirmedList.push(r);
          }
          if (r.status == "Confirmation needed") needed += 1;
        });

        confirmedList.sort((a,b) => (new Date(a.confirmed) - new Date(b.confirmed)) > 0 ? -1 : 1);
        var recent = confirmedList.slice(0,3);
        
        $.one(".num.num-confirmed .big-num").innerHTML = confirmed;
        $.one(".num.num-needed .big-num").innerHTML = needed;

        var template = recent.map(function(r) {
            return `<div class="recent"><strong>${r.confirmed.split(",")[0]}:</strong> ${r.name} confirmed as <span class="nobreak">${r.position}</span></div>`
        }).join("");

        $.one(".recent-container").innerHTML = template;
    // }

};

init();

pym.then(child => {
    child.sendHeight();

    // child.onMessage("on-screen", function(bucket) {
    //     ANALYTICS.trackEvent("on-screen", bucket);
    // });
    // child.onMessage("scroll-depth", function(data) {
    //     data = JSON.parse(data);
    //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    // });

    window.addEventListener("resize", () => child.sendHeight());

    // Default show first named row expanded
    // var rows = $(".row");
    // var firstNamedRow = rows.filter(r => !r.classList.contains("empty"))[0];
    // firstNamedRow.querySelector(".words").classList.add("show");

});
