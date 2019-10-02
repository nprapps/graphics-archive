console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");


var { isMobile } = require("./lib/breakpoints");

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var d3 = {
    ...require("d3-axis/dist/d3-axis.min"),
    ...require("d3-scale/dist/d3-scale.min"),
    ...require("d3-selection/dist/d3-selection.min"),
    ...require("d3-shape/dist/d3-shape.min"),
    ...require("d3-interpolate/dist/d3-interpolate.min")
};

d3.select('.fallback').attr("style", "display: none;")


function renderChart() {

    d3.select(".graphic").html("");

// Render the HTML legend.

    // var legend = d3.select(".graphic")
    //     .append("ul")
    //     .attr("class", "key")
    //     .selectAll("g")
    //     .data(DATA)
    //     .enter()
    //     .append("li")
    //     .attr("class", d => "key-item " + classify(d.race));

    // legend.append("b");

    // legend.append("label").text(d => d.race);


    if (isMobile.matches) {
        d3.select('.graphic').classed("mobile-graphic", true)
    }


    var povertyContainer = d3.select(".graphic").append("div")
        .attr('class', "poverty-container")

    var overallContainer = d3.select(".graphic").append("div")
        .attr('class', "overall-container")


    povertyContainer.append("h3")
        // .attr('class', "container-hed")
        .html("Children in poverty: 9.6 million")

    overallContainer.append("h3")
        // .attr('class', "container-hed")
        .html("All U.S. children: 73.6 million")


    var container = ".graphic";
    var element = document.querySelector(container);
    var width = element.offsetWidth - 5;
    var blockHeight = 50;


    var xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width])

    var povertyBars = povertyContainer.append("div").attr("class", "bar-container");
    var povertyLabels = povertyContainer.append("div").attr("class", "label-container");

    var overallBars = overallContainer.append("div").attr("class", "bar-container");
    var overallLabels = overallContainer.append("div").attr("class", "label-container");



    DATA.forEach(function(el, ind) {


        povertyBars.append("div")
            .attr('class', function() {
                return 'poverty-block block ' + classify(el.race) + "-block"
            })
            .attr('style', "width: " + xScale(el.poverty) + "px; height: " + blockHeight + "px")



        overallBars.append("div")
            .attr('class', function() {
                return 'overall-block block ' + classify(el.race) + "-block"
            })
            .attr('style', "width: " + xScale(el.overall) + "px; height: " + blockHeight + "px")

    })


    DATA.forEach(function(el, ind) {

    	var povString = (el.poverty * 100).toFixed(0) + "%"
    	var overallString = (el.overall * 100).toFixed(0) + "%"

    	if (ind == DATA.length - 1) {
    		povString = "Other: " + povString;
    		overallString = "Other: " + overallString;
    	}

        povertyLabels.append("div")
            .attr("class", "bar-label text-" + classify(el.race))
            .attr('style', "width: " + xScale(el.poverty) + "px;")
            .html(povString);


        overallLabels.append("div")
            .attr("class", "bar-label text-" + classify(el.race))
            .attr('style', "width: " + xScale(el.overall) + "px;")
            .html(overallString);
    })

}


renderChart();
window.addEventListener("resize", renderChart);

pym.then(child => {
    child.sendHeight();

    child.onMessage("on-screen", function(bucket) {
        ANALYTICS.trackEvent("on-screen", bucket);
    });
    child.onMessage("scroll-depth", function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });

    window.addEventListener("resize", () => child.sendHeight());
});
