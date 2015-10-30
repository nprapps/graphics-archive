// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    $("#olyGraphics li").click(function() {
        olyGraphicswap($(this).attr("id"));
    });
    $("#olyNav1").trigger("click");

    // tab swap function
    function olyGraphicswap(athleteTab) {
        var activeTab;
        switch(athleteTab) {
            case "olyNav1": activeTab = "athlete1"; break;
            case "olyNav2": activeTab = "athlete2"; break;
            case "olyNav3": activeTab = "athlete3"; break;
            case "olyNav4": activeTab = "athlete4"; break;
            case "olyNav5": activeTab = "athlete5"; break;
        }
        $("#" + athleteTab).addClass("tab-open");
        $("#" + athleteTab).siblings("li").removeClass("tab-open");
        $("div.athlete").hide();
        $("#" + activeTab).show();

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
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    // renderGraphic({
    //     container: '#graphic',
    //     width: containerWidth,
    //     data: []
    // });

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
