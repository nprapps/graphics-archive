// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

    $("#atab1").addClass("tab-open");
	$("#navi li").click(function() {
        hcSwapTab($(this).attr("id"));
    });
}


var hcSwapTab = function(hcBtn) {
    switch(hcBtn) {
        case "atab1": var hcPanel = "a1"; break;
        case "atab2": var hcPanel = "a2"; break;
        case "atab3": var hcPanel = "a3"; break;
        case "atab4": var hcPanel = "a4"; break;
        case "atab5": var hcPanel = "a5"; break;
        case "atab6": var hcPanel = "a6"; break;
        case "atab7": var hcPanel = "a7"; break;
        case "atab8": var hcPanel = "a8"; break;
        case "atab9": var hcPanel = "a9"; break;
        case "atab10": var hcPanel = "a10"; break;
        case "atab11": var hcPanel = "a11"; break;
    }
    $("#" + hcBtn).addClass("tab-open");
    $("#" + hcBtn).siblings("li").removeClass("tab-open");
    $("div.aInfo").hide();

    $("#" + hcPanel).show();

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
