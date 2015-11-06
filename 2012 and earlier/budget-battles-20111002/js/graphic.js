// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    $("#bbExplainer li").click(function() {
		bbSwap($(this).attr("id"));
	});
	$("#bbNav1").trigger("click");
	$(".bbNav2Link").click(function() {
		$("#bbNav2").trigger("click");
	});

	// tab swap function
	function bbSwap(bbTab) {
		var activeBB;
		switch(bbTab) {
			case "bbNav1": activeBB = "bbFiscal"; break;
			case "bbNav2": activeBB = "bbDebt"; break;
			case "bbNav3": activeBB = "bbSS"; break;
		}
		$("#" + bbTab).addClass("tab-open");
		$("#" + bbTab).siblings("li").removeClass("tab-open");
		$("div.bbSection").hide();
		$("#" + activeBB).show();

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
	}

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
