// Constants
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 480;

// Globals
var pymChild = null;
var isMobile = false;

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({
        renderCallback: render
    });
}

var render = function(containerWidth) {
    // Fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    if (isMobile) {
        $('table').hide();
        $('.fold .show').show();
        $('.fold .hide').hide();
    } else {
        $('table').css('display', 'table');
    }

    // Resize iframe to fit
    if (pymChild) {
        pymChild.sendHeight();
    }
}

$('.fold .show').on('click', function() {
    $(this).hide();
    $(this).parent().find('.hide').show();

    $(this).parent().parent().find('table').css('display', 'table');

    if (pymChild) {
        pymChild.sendHeight();
    }

    return false;
});

$('.fold .hide').on('click', function() {
    $(this).hide();
    $(this).parent().find('.show').show();

    $(this).parent().parent().find('table').hide();

    if (pymChild) {
        pymChild.sendHeight();
    }

    return false;
});

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
