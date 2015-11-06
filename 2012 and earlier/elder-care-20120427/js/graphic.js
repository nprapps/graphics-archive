// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    $("#res151309029 li").click(function() {
        var tIndex = $("#res151309029 li").index(this);
        $(this).addClass("selected").siblings("li").removeClass("selected");
        switch (tIndex) {
            case 0: // nursing
                $("#res151303841").show();
                $("#res151305610").hide();
                $("#res151306991").hide();
                $("#res151308571").hide();
                break;
            case 1: // assisted
                $("#res151303841").hide();
                $("#res151305610").show();
                $("#res151306991").hide();
                $("#res151308571").hide();
                break;
            case 2: // home
                $("#res151303841").hide();
                $("#res151305610").hide();
                $("#res151306991").show();
                $("#res151308571").hide();
                break;
            case 3: // adult day
                $("#res151303841").hide();
                $("#res151305610").hide();
                $("#res151306991").hide();
                $("#res151308571").show();
                break;
        }

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    });
    $("#res151309029 li:eq(0)").trigger("click");
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
