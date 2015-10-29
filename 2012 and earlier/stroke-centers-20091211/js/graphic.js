// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    $("ul.scStates li").click( function() {
		thisClass = $(this).attr("class");
		thisRel   = $(this).attr("rel");
//		alert("class: " + thisClass + " | rel: " + thisRel);

		$(this).addClass("active");
		$(this).siblings("li").removeClass("active");

		// show relevant scCities UL, hide others
		$(".scInfo").hide();
		$("ul.scCenters").hide();
		$("ul.scCities").hide();
		$("ul[class='scCities'][rel='" + thisRel + "']").show().children("li").removeClass("active");
	});


	$("ul.scCities li").click( function() {
		thisClass = $(this).attr("class");
		thisRel   = $(this).attr("rel");
		parentClass = $(this).parent("ul").attr("class");
		parentRel = $(this).parent("ul").attr("rel");
//		alert("class: " + thisClass + " | rel: " + thisRel + " | parent: " + parentRel + " | parentClass: " + parentClass);

		$(this).addClass("active");
		$(this).siblings("li").removeClass("active");

		// show relevant scCenters UL, hide others
		$(".scInfo").hide();
		$("ul.scCenters").hide();
		$("ul[class='scCenters'][rel='" + parentRel + " " + thisRel + "']").show().children("li").removeClass("active");
	});

	$("ul.scCenters li").click( function() {
		thisClass = $(this).attr("class");
		thisRel   = $(this).attr("rel");
		parentRel = $(this).parent("ul").attr("rel");
//		alert("class: " + thisClass + " | rel: " + thisRel + " | parent: " + parentRel);

		$(this).addClass("active");
		$(this).siblings("li").removeClass("active");

		// show relevant scInfo DIV, hide others
		$(".scInfo").hide();
		theDesc = $("div[class='scInfo'][id='" + thisRel + "']")
		theDesc.show();
		theDesc.children(".scMap").remove();

		theMapSrc = theDesc.children("p.mapsrc").text();
		theDesc.children("p.mapsrc").hide();
		$("<p class=\"scMap\"><img src=\"" + theMapSrc + "\" alt=\"Locator Map\" /></p>").insertBefore(theDesc.children("p.more"));

	});

    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
