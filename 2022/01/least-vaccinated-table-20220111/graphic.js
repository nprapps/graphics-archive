console.clear();
var pym = require("./lib/pym");
require("./lib/webfonts");

// var d3 = {
//   ...require("d3-axis/dist/d3-axis.min"),
//   ...require("d3-scale/dist/d3-scale.min"),
//   ...require("d3-selection/dist/d3-selection.min"),
//   ...require("d3-geo/dist/d3-geo.min"),
//   ...require("d3-array/dist/d3-array.min"),
//   ...require("d3-scale-chromatic/dist/d3-scale-chromatic.min")
// };

// var table = d3.select("div#country-table");

// var colorScale = d3.scaleSequential(d3.interpolateYlGnBu)
//                       .domain([0,100]);

// var values = table.selectAll(`[data-title="% fully vaccinated"] span`)

// values.style("background-color", function(d){
//     var value = Number(d3.select(this).html().replace("%",""));
//     return colorScale(value);
// })

// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))



pym.then(child => {
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
});
