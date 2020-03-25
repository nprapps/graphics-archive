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
		clearInterval(window.rotateInt);

		if (fullW != window.innerWidth) {
			render();
			fullW = window.innerWidth;
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

function shuffle(array) {
	array.sort(() => Math.random() - 0.5);
}

var render = function() {
	//remove fallback
	d3.select(".fallback").remove();


	var showMax = 6;

	var numPerRow = 3;

	if (isTablet.matches) {
		showMax = 9;
		numPerRow = 3;
	}

	if (isMobile.matches) {
		showMax = 6;
		numPerRow = 2;
	}


	var parentContainer = d3.select(".small-mults-container");

	var parentContainerSelector = document.querySelector(
		".small-mults-container"
	);

	smallMultContainerWidth = parentContainerSelector.offsetWidth;
	var w = smallMultContainerWidth / numPerRow / 2 - 15;
	var h = w;

	//begin displaying small multiples

	function renderSmallMults(excludeName) {
		d3.select(".small-mults-container").html("");

		DATA = DATA.filter(d => d["r"] < -0.5);
		console.log(DATA)
		// shuffle(DATA);
		DATAFILTERED = Object.assign([], DATA);
		DATAFILTERED = DATAFILTERED.splice(0, showMax);

		for (var city of DATAFILTERED) {
			var thisCityContainer = parentContainer.append("div");

			thisCityContainer.attr("class", "small-mult");

			thisCityContainer.attr("width", smallMultContainerWidth / 3);
			if (isMobile.matches) {
				thisCityContainer.attr("width", smallMultContainerWidth);
			}

			if (city["r"]) {
				var title = thisCityContainer
					.append("h4")
					.html(`${city.city}, ${city.state}`);
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
			}
		}
	}

	renderSmallMults();

	// rotate through

	function newMap(excludePos) {
		var displayedCities = []
		d3.selectAll(".small-mult .heat")
			.attr("None", function() {
				var thisCity = d3.select(this).attr("class").replace("heat ", "")
				displayedCities.push(thisCity)
			})

		var chooseCities = Object.assign([], DATA.filter(d=>displayedCities.indexOf(d['city-dash']) == -1 ))


		// shuffle(DATA);
		var newCity = DATA[0];

		function getRandomInt(max) {
			return Math.floor(Math.random() * Math.floor(max));
		}


		var replacePos = getRandomInt(showMax);

		while (excludePos.indexOf(replacePos) > -1) {
			replacePos = getRandomInt(showMax);
		}


		fadeElement = document.getElementsByClassName("small-mult")[replacePos];
		fadeElement.classList.add("fading");
		fadeElement.style.opacity = 0;

		d3.select(".fading .heat")
			.attr("class", "heat")
			.classed(newCity["city-dash"], true);

		d3.select(".fading .income")
			.attr("class", "income")
			.classed(newCity["city-dash"], true);

		window.setTimeout(function() {
			buildMap(newCity, w, h, ".small-mult");

			window.setTimeout(function() {
				d3.select(".fading h4").html(
					`${newCity.city}, ${newCity.state}`
				);

				fadeElement.style.opacity = 1;

				d3.selectAll(".fading").classed("fading", false);
			}, 250);
		}, 1000);
		return replacePos
	}

	var excludePos = [];
	window.rotateInt = setInterval(function() {
		excludePos.push(newMap(excludePos));

		if (excludePos.length == showMax) {
			excludePos = []
		}
	}, 3500);

	pymChild.sendHeight();
};

//first render
render();

//
