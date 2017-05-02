var guns = ['9mm', '308r', '12g', 'sar15'];
var types = ['ns', 'ws'];

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
}

$(document).ready(function(){
    for (var i = 0; i < guns.length; i++) {
        var gun = guns[i];

        for (var j = 0; j < types.length; j++) {
            var type = types[j];

            js_audioPlayer(gun,type,i);

        }
    }


    function js_audioPlayer(gun,type,location) {

        jQuery("#jquery_jplayer_" + type + "_" + location).jPlayer({
            ready: function () {
                jQuery(this).jPlayer("setMedia", {
                    mp3: 'assets/20170315_blog_' + gun + '_' + type + '.mp3'
                });
            },
            play: function() {
                $(".jPlayer").not(this).jPlayer("stop");
            },
            cssSelectorAncestor: "#jp_container_" + type + "_" + location,
            swfPath: "/js/lib"
        });

    }

});

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
