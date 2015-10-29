// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {

    $("#res150055846 li").click(function() {
        var tIndex = $("#res150055846 li").index(this);
        $(this).addClass("tab-open").siblings("li").removeClass("tab-open");
        switch(tIndex) {
            case 0:
                $('#res150055839').hide();
                $('#res150055818').hide();
                $('#res150055812').show();
                break;
            case 1:
                $('#res150055839').hide();
                $('#res150055818').show();
                $('#res150055812').hide();
                break;
            case 2:
                $('#res150055839').show();
                $('#res150055818').hide();
                $('#res150055812').hide();
                break;
        }
    });
    $("#res150055846 li:first-child").trigger("click");

    pymChild = new pym.Child({});
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
