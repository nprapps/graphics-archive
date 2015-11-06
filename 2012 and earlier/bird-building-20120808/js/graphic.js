// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    var bg = $('#birdbg');
    var mkrs = $('#birdMarkers');
    var overlay = $('#birdOverlay');

    function init() {
        overlay.hide();
        mkrs.find('.marker').find('.content').hide();
    }

    mkrs.find('.marker').hover(function() {
        $(this).addClass('active').siblings('.marker').removeClass('active');
    },
    function() {
        $(this).removeClass('active');
    });

    mkrs.find('.marker').click(function() {
        mkrs.find('.marker').find('.content').hide();
        overlay.empty().append('<div class="close">x<\/div><img src="' + $(this).find('.content').find('img').attr('src') + '" alt="" />' + '<h3>' + $(this).find('h3').html() + '<\/h3><p>' + $(this).find('.content').find('p').html() + '<\/p><div class="captionwrap">' + $(this).find('.content').find('div').html() + '<\/div>');

        if ($(this).find('.content').hasClass('vert')) {
            overlay.addClass('vert');
        } else {
            overlay.removeClass('vert');
        }
        overlay.fadeIn('fast');
        mkrs.fadeTo('fast',.3);
        bg.fadeTo('fast',.3);
    });

    overlay.click(function() {
        overlay.fadeOut('fast');
        mkrs.fadeTo('fast',1);
        bg.fadeTo('fast',1);
    });

    init();

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
