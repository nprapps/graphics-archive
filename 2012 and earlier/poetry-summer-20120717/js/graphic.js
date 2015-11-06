// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    $("#res156627599 li").click(function() {
        var tIndex = $("#res156627599 li").index(this);
        $(this).addClass("tab-open").siblings("li").removeClass("tab-open");
        switch(tIndex) {
            case 0:
                $('#res156627366').hide();
                $('#res156627351').show();
                break;
            case 1:
                $('#res156627366').show();
                $('#res156627351').hide();
                break;
        }

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    });
    $("#res156627599 li:first-child").trigger("click");
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
