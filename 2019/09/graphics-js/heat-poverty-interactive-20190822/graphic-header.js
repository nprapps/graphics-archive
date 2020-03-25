console.clear();
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile, isTablet } = require("./lib/breakpoints");

var d3 = {
	...require("d3-transition/dist/d3-transition.min"),
	...require("d3-selection/dist/d3-selection.min"),
	...require("d3-scale/dist/d3-scale.min"),
	// ...require("d3/dist/d3.min"),
	...require("d3-scale-chromatic/dist/d3-scale-chromatic.min")
};


var legendContainer = d3.select(".legend-container")


var redScaleContainer = legendContainer
	.append("div")
	.attr("class", "red-scale-container");

var greenScaleContainer = legendContainer
	.append("div")
	.attr("class", "green-scale-container");

greenScaleContainer.append("div").attr("class", "scale-scale green-scale");
redScaleContainer.append("div").attr("class", "scale-scale red-scale");


var greenScaleLabels = greenScaleContainer
	.append("div")
	.attr("class", "legend-labels");
var redScaleLabels = redScaleContainer
	.append("div")
	.attr("class", "legend-labels");

var labelContainers = [ greenScaleLabels, redScaleLabels];

for (i in labelContainers) {
	var leftText, rightText, middleText;
	if (labelContainers[i] == redScaleLabels) {
		leftText = "Cooler";
		rightText = "Hotter";
		middleText = "";
	} else if (labelContainers[i] == greenScaleLabels){
		leftText = "Poorer";
		rightText = "Richer";
		middleText = "";
	} else if (labelContainers[i] == blueScaleLabels){
	}


	labelContainers[i]
		.append("div")
		.attr("class", "left-label")
		.html(leftText);
	labelContainers[i]
		.append("div")
		.attr("class", "right-label")
		.html(rightText);
	labelContainers[i]
		.append("div")
		.attr("class", "middle-label")
		.html(middleText);
	labelContainers[i].append("div").attr("class", "clearfix");
}

var pymChild = null;
pym.then(function(child) {
	pymChild = child;
	child.sendHeight();
})

window.setInterval(function(){
	pymChild.sendHeight();
},2000)

//
