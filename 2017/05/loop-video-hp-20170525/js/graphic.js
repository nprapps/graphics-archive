// Global vars
var pymChild = null;
var DEFAULT_WIDTH = 600;
var initial_load = true;

// Returns true with the exception of iPhones with no playsinline support
Modernizr.addTest('iphonewoplaysinline', function () {
    return navigator.userAgent.toLowerCase().match(/iP(hone|od)/i) ? ('playsInline' in document.createElement('video')) : true;
});

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({renderCallback: render});
}

var adaptSourceToScreen = function(src, containerWidth) {
    // Try to adapt the video quality to the screen size
    var finalSrc = src;
    if (containerWidth <= 740) {
        finalSrc = src.replace('.mp4','-500000.mp4');
    } else if (containerWidth <= 1024){
        finalSrc = src.replace('.mp4','-1500000.mp4');
    }
    return finalSrc;
}

var initBackgroundVideo = function(el, containerWidth) {
    var videoTag = null;
    if (!el.classList.contains('loaded')) {
        var src = el.getAttribute("data-src");
        var poster = el.getAttribute("data-poster");
        var width = el.getAttribute("data-width");
        var loop = el.getAttribute("data-loop");
        var muted = el.getAttribute("data-muted");
        var autoplay = el.getAttribute("data-autoplay");
        var preload = el.getAttribute("data-preload");

        // HTML5 native video tag
        videoTag = document.createElement('video');
        if (muted != null) {
            videoTag.setAttribute('muted','');
            // Hack around muted on Firefox
            videoTag.muted = true;
        }
        if (loop != null) {
            videoTag.setAttribute('loop','');
        }
        if (preload != null) {
            videoTag.setAttribute('preload', preload);
        }
        videoTag.setAttribute('autoplay','');
        videoTag.setAttribute('playsinline','');
        videoTag.setAttribute('poster',poster);
        videoTag.setAttribute('width',width);
        // Check if iPhone with no playsinline support
        if (Modernizr.iphonewoplaysinline) {
            var source = document.createElement('source');
            var finalSrc = adaptSourceToScreen(src, containerWidth);
            source.setAttribute('src',finalSrc);
            videoTag.appendChild(source);
            videoTag.oncanplay = updateIFrame;
        }

        el.insertBefore(videoTag, el.querySelector(".video-caption"));
        var sources = videoTag.querySelectorAll('source');
        if (sources.length !== 0) {
            var lastSource = sources[sources.length-1];
            lastSource.addEventListener('error', function() {
                updateIFrame();
            });
        }
        else {
            updateIFrame();
        }
        // Finally mark the videoWrapper as loaded
        el.classList.add('loaded');
    }
}

var updateIFrame = function() {
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
    if (initial_load) {
        initial_load = false;
        initBackgroundVideo(document.querySelector('#intro-vid'), containerWidth);
    }
    updateIFrame();
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
