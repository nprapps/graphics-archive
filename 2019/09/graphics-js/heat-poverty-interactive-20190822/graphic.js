console.clear();
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var d3 = {
	...require("d3-selection/dist/d3-selection.min"),
	...require("d3-scale/dist/d3-scale.min"),
	// ...require("d3/dist/d3.min"),
	...require("d3-scale-chromatic/dist/d3-scale-chromatic.min")
};

var buildMap = require("./buildMap");

var pymChild = null;
pym.then(function(child) {
	pymChild = child;
	child.sendHeight();

	var fullW = 0;

	d3.select(window).on("load", function() {
		fullW = window.innerWidth;
	});

	d3.select(window).on("resize", function() {
		if (fullW != window.innerWidth) {
			var cityVal = d3.select(".city-select").property("value");
			render(d3.select(".large-container").attr("data-cityname"));
			fullW = window.innerWidth;
			d3.select(".city-select").property("value", cityVal)
		}
	});


	child.onMessage("on-screen", function(bucket) {
		ANALYTICS.trackEvent("on-screen", bucket);
	});
	child.onMessage("scroll-depth", function(data) {
		data = JSON.parse(data);
		ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
	});
});

//sort by r values

DATA.sort(function(a, b) {
	return a["r"] - b["r"];
});

// filter without anchorage and get only top 10 for intial view

var render = function(firstCity) {
	//remove fallback
	d3.select(".fallback").remove();

	var showMax = 10;

	var DATAFILTERED = Object.assign([], DATA);
	DATAFILTERED = DATAFILTERED.splice(0, showMax);

	// need to have a function that puts in the big one

	function renderLargeMap(cityName) {
		d3.select(".large-container").html('');
		d3.select(".large-title").html('');

		var city = Object.assign({}, DATA.filter(d => d.name == cityName)[0]);

		// check if the city requires a state or if it stands alone per AP dateline style
		var cityTitle = city.standalone ? city.city : `${city.city}, ${city.state}`;

		var parentContainer = d3.select(".graphic");

		var thisCityContainer = d3.select(".large-container");

		thisCityContainer.attr("data-cityname", cityName);

		var largeTitle = d3.select(".large-title");

		var largeMap = thisCityContainer
			.append("div")
			.attr("class", "large-map map-only");

		if (city.response != undefined && city.response != "DNA") {
			var largeResponse = thisCityContainer
				.append("div")
				.attr("class", "large-response");
			largeMap.classed("map-only", false);
		}

		var mapContainerWidth = document.getElementsByClassName("large-map")[0]
			.offsetWidth;

		var w = mapContainerWidth / 2 - 10;
		var maxMapWidth = 320;
		if (w > maxMapWidth) {
			w = maxMapWidth;
		}
		var h = w;

		if (isMobile.matches) {
			w = mapContainerWidth - 10;
			h = w;
		}

		var numStronger;

		for (i in DATA) {
			if (DATA[i].name == city.name) {
				if (i < 10) {
					i = {0: "zero",
						1: "one",
						2: "two",
						3: "three",
						4: "four",
						5: "five",
						6: "six",
						7: "seven",
						8: "eight",
						9: "nine"}[i]
				}
				numStronger = i;
			}
		}

		var labelClassifyer = "";


		function classify(city){
			var thresholds = [-.1, -.3, -.5, -.7];
			var thresholdDistance = {};
			for (i in thresholds) {
				// console.log(city)
				thresholdDistance[thresholds[i]] = (thresholds[i] - city['r'])
			}
			var closestThreshold = 0
			var minDist = 100
			for (i in thresholds) {
				if (Math.abs(thresholdDistance[thresholds[i]]) < minDist) {
					minDist = thresholdDistance[thresholds[i]]
					closestThreshold = thresholds[i]
				}
			}
			var classifications = {'-0.1': "weak or no",
									'-0.3': "slight",
									'-0.5': "moderate",
									'-0.7': "strong"}
			return classifications[closestThreshold.toString()]
		}

		var title = largeTitle.append("h1").html("Heat And Income In <strong>" + cityTitle + "</strong>");
		var addToDesc = ""
		if (city.response == "DNA") {
			addToDesc = " "+ city.city +" did not answer questions from NPR."
		}
		var desc = largeTitle.append("h2").html("Census tracts in <strong>" + city.city + "</strong>  displayed a <span class='classify-type " + classify(city).split(' ').join('-') + "'>" + classify(city) + "</span> correlation between heat and income." + addToDesc);

		if (city.response != undefined && city.response != "DNA") {
			var response = largeResponse.append("div")
				.attr("class", "map-desc-title city-response-title")
				.html("City response");
			var response = largeResponse.append("p").html(city.response);
		}

		// put in map titles

		var mapTitles = ["Surface temp.", "Income"];

		if (!isMobile.matches) {
			for (i in mapTitles) {
				largeMap
					.append("div")
					.attr("class", "map-desc-title")
					.html(mapTitles[i]);
			}
		}

		// put in maps

		var heatSvg = largeMap
			.append("svg")
			.attr("class", `heat ${city["city-dash"]}`)
			.attr("width", w)
			.attr("height", h);

		var incomeSvg = largeMap
			.append("svg")
			.attr("class", `income ${city["city-dash"]}`)
			.attr("width", w)
			.attr("height", h);

		buildMap(city, w, h, ".large-map");

		if (isMobile.matches) {
			for (i in mapTitles) {
				var insertAfter;
				if (i==0) {insertAfter = `.heat.${city["city-dash"]}`}
				if (i==1) {insertAfter = `.income.${city["city-dash"]}`}
				largeMap
					.insert("div", insertAfter)
					.attr("class", "map-desc-title map-desc-title-mobile")
					.html(mapTitles[i]);
			}
		}

		// put on gradients

		var legendContainer = largeMap
			.append("div")
			.attr("class", "legend-container");

		var redScaleContainer = legendContainer
			.append("div")
			.attr("class", "red-scale-container scale-container");

		var greenScaleContainer = legendContainer
			.append("div")
			.attr("class", "green-scale-container scale-container");

		greenScaleContainer
			.append("div")
			.attr("class", "scale-scale green-scale");
		redScaleContainer.append("div").attr("class", "scale-scale red-scale");

		var greenScaleLabels = greenScaleContainer
			.append("div")
			.attr("class", "legend-labels");
		var redScaleLabels = redScaleContainer
			.append("div")
			.attr("class", "legend-labels");

		var labelContainers = [greenScaleLabels, redScaleLabels];

		for (i in labelContainers) {
			var leftText, rightText, middleText;
			if (labelContainers[i] == redScaleLabels) {
				leftText = "Cooler";
				rightText = "Hotter";
				middleText = "";
			} else {
				leftText = "";
				rightText = "";
				middleText = "";
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

		if (isMobile.matches) {
			d3.select(".large-map")
				.insert(function() {
				  return redScaleContainer.remove().node();
				}, "svg.heat + *");
		}
	}



	//begin displaying small multiples

	function renderSmallMults(excludeName) {
		d3.select(".small-mults-container").html("");

		var parentContainer = d3.select(".small-mults-container");

		var parentContainerSelector = document.querySelector(
			".small-mults-container"
		);
		smallMultContainerWidth = parentContainerSelector.offsetWidth;

		for (var city of DATAFILTERED) {
			var thisCityContainer = parentContainer.append("div");

			thisCityContainer.attr("class", "small-mult " + city.name);

			thisCityContainer.attr("data-cityname", city.name);
			thisCityContainer.attr("width", smallMultContainerWidth / 3);
			if (isMobile.matches) {
				thisCityContainer.attr("width", smallMultContainerWidth);
			}

			var w = smallMultContainerWidth / 3 / 2 - 10;
			if (isMobile.matches) {
				var w = smallMultContainerWidth / 2 / 2 - 10;
			}
			var h = w;

			if (city["r"]) {
				// check if the city requires a state or if it stands alone per AP dateline style
				var cityTitle = city.standalone ? city.city : `${city.city}, ${city.state}`;

				var title = thisCityContainer
					.append("h4")
					.html(cityTitle);
				var heatSvg = thisCityContainer
					.append("svg")
					.attr("class", `heat ${city["city-dash"]}`)
					.attr("width", w)
					.attr("height", h);

				var incomeSvg = thisCityContainer
					.append("svg")
					.attr("class", `income ${city["city-dash"]}`)
					.attr("width", w)
					.attr("height", h);

				buildMap(city, w, h, ".small-mult");
				if (excludeName == city.name) {
					thisCityContainer.classed("hidden-small-mult", true);
				}
			}
		}
	}

	renderLargeMap(firstCity);
	renderSmallMults(firstCity);

	// make interactive

	d3.selectAll(".small-mult").on("click", function() {
		var cityName = d3.select(this).attr("data-cityname");
		renderLargeMap(cityName);
		d3.select(".hidden-small-mult").classed("hidden-small-mult", false);
		d3.select(".small-mult." + cityName).classed("hidden-small-mult", true);
		d3.select(".state-select").property("value", "state-select");
		filterCityOptions();
		pymChild.sendHeight();
		pymChild.scrollParentToChildEl("large-title")
		// document.getElementById("chart").scrollIntoView(true);
	});

	function filterCityOptions() {
		d3.selectAll("select.city-select option").remove();

		var selectedStateVal = d3.select(".state-select").property("value");

		if (selectedStateVal == "state-select") {
			d3.select("select.city-select")
				.append("option")
				.attr("class", "generic-city-select")
				.html("Select a city");
		}

		//sort by name
		DATA.sort(function(a, b) {
			if (a.name > b.name) {
				return 1;
			}
			return -1;
		});

		for (var i = 0; i < DATA.length; i++) {
			if (DATA[i].state == selectedStateVal) {
				d3.select("select.city-select")
					.append("option")
					.attr("state-value", DATA[i].state)
					.attr("value", DATA[i].name)
					.html(function(){
						var cityName = DATA[i].city;
						if (['Kansas', 'Oklahoma'].indexOf(cityName) > -1) {
							return cityName + " City"
						}
						else {
							return cityName
						}
					});
			}
		}

		//sort by r values

		DATA.sort(function(a, b) {
			return a["r"] - b["r"];
		});
	}

	// what to do when select options get changed
	d3.selectAll("select").on("change", function() {
		if (d3.select(this).attr("class") == "state-select") {
			filterCityOptions();
		}
		var selectedStateVal = d3.select(".state-select").property("value");

		if (selectedStateVal == "state-select") {
			return;
		}

		var selectedCityVal = d3.select(".city-select").property("value");

		renderLargeMap(selectedCityVal);
		d3.select(".hidden-small-mult").classed("hidden-small-mult", false);
		d3.select(".small-mult." + selectedCityVal).classed(
			"hidden-small-mult",
			true
		);

		pymChild.sendHeight();

		d3.selection.prototype.size = function() {
			var n = 0;
			this.each(function() {
				++n;
			});
			return n;
		};

		// if (d3.select(this).classed("city-select") == true) {
		// 	document.getElementById("chart").scrollIntoView(true);
		// } else if (d3.selectAll(".city-select option").size() == 1) {
		// 	document.getElementById("chart").scrollIntoView(true);
		// }
	});

	filterCityOptions();

};

//first render
render("california-oakland");
