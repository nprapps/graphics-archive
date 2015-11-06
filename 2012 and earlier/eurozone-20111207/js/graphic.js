// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    $("#pmTables20111207 #tabs li").click(function() {
        var tIndex = $("#pmTables20111207 #tabs li").index(this);
        $(this).addClass("selected").siblings("li").removeClass("selected");
        $("#pmTables20111207 div:eq(" + tIndex + ")").show().siblings("div").hide();

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    });
    $("#pmTables20111207 #tabs li:first-child").trigger("click");
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
