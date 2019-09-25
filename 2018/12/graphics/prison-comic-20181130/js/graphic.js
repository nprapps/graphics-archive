// Global vars
var pymChild = null;
var isMobile = false;
var wasMobile = false;
var LAZYLOAD_AHEAD = 1;
var DEBOUNCE_WAIT = 50;
var trackers = {};

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    //Carebot
    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

    window.addEventListener("unload", onUnload);
    // Listen to pym scroll message
    // Loop through the available trackers and test visibility
    pymChild.onMessage('viewport-iframe-position', function(parentInfo) {
        for (var tracker in trackers) {
            if (trackers.hasOwnProperty(tracker)) {
                trackers[tracker].checkIfVisible(parentInfo);
            }
        }
    });
    // Track all lazyload images
    trackImages();
    // request parent info to trigger initial visibility
    pymChild.getParentPositionInfo();
}

/*
 * Update pym iframe height
 */
var updateIFrame = function() {
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Debounce the sendHeight to the parent to avoid
 * too many events sent while the assets are being lazy loaded.
 */
debouncedUpdateIFrame = _.debounce(updateIFrame, DEBOUNCE_WAIT);

var trackImages = function() {
    var images = document.querySelectorAll('.image-wrapper');
    [].forEach.call(images, function(image) {
        var id = image.getAttribute('id');
        var tracker = new PymChildScrollVisibility.Tracker(id, onImageVisible);
        trackers[id] = tracker;
    });
}

// IMAGES
var renderImage = function(imageWrapper) {
    var src = null;
    var image = imageWrapper.getElementsByTagName('img')[0];
    if (isMobile) {
        src = imageWrapper.getAttribute("data-src-mobile");
    }
    else {
        src = imageWrapper.getAttribute("data-src-desktop");
    }
    image.setAttribute("src", src);
}

var lazyload_image = function(imageWrapper) {
    if (imageWrapper.classList.contains("loaded")) { return; }
    var src = imageWrapper.getAttribute("data-src-desktop");
    if (src) {
        renderImage(imageWrapper)
        imagesLoaded(imageWrapper, function() {
            imageWrapper.classList.add('loaded')
            debouncedUpdateIFrame();
        })
    }
}


/* Lazy loading of images */
var lazyload_assets = function(wrapper, stop) {
    stop = stop || 0;
    // Lazyload images
    var images = wrapper.querySelectorAll(".image-wrapper");

    [].forEach.call(images, function(image) {
        lazyload_image(image);
    });

    if (stop < LAZYLOAD_AHEAD && wrapper.nextElementSibling) {
        lazyload_assets(wrapper.nextElementSibling, stop + 1);
    }
}

var adaptLoadedImageSrc = function() {
    var wrappers = document.querySelectorAll('.image-wrapper');
    [].forEach.call(wrappers, function(wrapper) {
        if (wrapper.classList.contains("loaded")) {
            renderImage(wrapper)
            imagesLoaded(wrapper, function() {
                debouncedUpdateIFrame();
            })
        }
    });
}

var onImageVisible = function(id) {
    // console.log("onImageVisible", id);
    var imageWrapper = document.getElementById(id);
    // Use parent element to be able to load siblings
    lazyload_assets(imageWrapper.parentElement);
    // mark image as viewed
    imageWrapper.classList.add('viewed');
    // Remove tracking of image visibility since it has already been loaded
    delete trackers[id];
}

var onUnload = function(e) {
    var numImages = document.querySelectorAll('.image-wrapper').length;
    var viewedImages = document.querySelectorAll('.image-wrapper.viewed').length;

    var strImages = numImages.toString();
    var strViewed = viewedImages.toString();
    var percentageViewed = viewedImages / numImages;
    var nearestTenth = Math.floor10(percentageViewed, -1);
    var nearestTenthStr = nearestTenth.toString();

    // Track posts read data
    ANALYTICS.trackEvent('images-viewed', strViewed, viewedImages);
    ANALYTICS.trackEvent('images-on-page', strImages, numImages);
    ANALYTICS.trackEvent('percentage-images-viewed', nearestTenthStr);
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
        if (!wasMobile) {
            adaptLoadedImageSrc();
        }
    } else {
        isMobile = false;
        if (wasMobile) {
            adaptLoadedImageSrc();
        }
    }
    // Store whether current viewport is mobile or not
    wasMobile = isMobile;

    // Update iframe
    updateIFrame();
}

// via https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round#Decimal_rounding
var decimalAdjust = function(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

Math.floor10 = function(value, exp) {
    return decimalAdjust('floor', value, exp);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
