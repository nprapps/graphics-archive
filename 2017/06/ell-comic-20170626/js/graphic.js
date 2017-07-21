// Global vars
var pymChild = null;
var isMobile = false;
var initMobile;
var LAZYLOAD_AHEAD = 2;
var DEBOUNCE_WAIT = 50;
var VISIBILITY_TEST_TIMEOUT = 1000;
var timeoutID = null;


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
    // Visibility tracker available
    pymChild.onMessage('visibility-available', onVisibilityAvailable)
    // Parent asks for the position of the element to check visibility
    pymChild.onMessage('request-bounding-client-rect', onBoundingClientRectRequest);
    // Once an image is partially on the viewport
    pymChild.onMessage('element-visible', onImageVisible);

    // Test visibility availability and fallback to load all images
    pymChild.sendMessage('test-visibility-tracker', 'test');
    timeoutID = setTimeout(trackerNotDetected, VISIBILITY_TEST_TIMEOUT);
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
    var imageSelector = initMobile ? '.image-wrapper-mobile' : '.image-wrapper';
    var images = document.querySelectorAll(imageSelector);
    [].forEach.call(images, function(image) {
        var id = image.getAttribute('id');
        pymChild.sendMessage('request-tracking', id);
    });
}

// IMAGES
var renderImage = function(imageWrapper) {
    var image = imageWrapper.getElementsByTagName('img')[0];
    var src = imageWrapper.getAttribute("data-src");
    image.setAttribute("src", src);
    imageWrapper.removeAttribute("data-src");
    var id = imageWrapper.getAttribute("id");
}

var lazyload_image = function(imageWrapper) {
    if (imageWrapper.classList.contains("loaded")) { return; }
    var src = imageWrapper.getAttribute("data-src");
    if (src) {
        renderImage(imageWrapper)
        imagesLoaded(imageWrapper, function() {
            imageWrapper.classList.add('loaded')
            debouncedUpdateIFrame();
        })
    }
}


/* Lazy loading of images */
var lazyload_assets = function(imageWrapper, stop) {
    stop = stop || 0;
    // Lazyload images
    lazyload_image(imageWrapper)

    if (stop < LAZYLOAD_AHEAD && imageWrapper.nextElementSibling) {
        lazyload_assets(imageWrapper.nextElementSibling, stop + 1);
    }
}

/*
 * Fallback used when the childTracker is not detected
 */
var trackerNotDetected = function() {
    // console.log("tracker not detected");
    var wrappers = document.querySelectorAll('.image-wrapper');
    [].forEach.call(wrappers, function(wrapper) {
        lazyload_image(wrapper);
    });
}

// event handlers
var onVisibilityAvailable = function() {
    window.clearTimeout(timeoutID);
    // Track images to lazyload them
    trackImages();
}

var onImageVisible = function(id) {
    // console.log("onImageVisible", id);
    var imageWrapper = document.getElementById(id);
    lazyload_assets(imageWrapper);
    // mark image as viewed
    imageWrapper.classList.add('viewed');
    // Remove tracking of image visibility since it has already been loaded
    pymChild.sendMessage('remove-tracker', id);
}

var onBoundingClientRectRequest = function(id) {
    // console.log("BoundingRectReceived", id);
    var container = document.getElementById(id);
    // Ignore messages sent to posts that
    // have deing deleted from page
    if (!container) { return; }
    var rect = container.getBoundingClientRect();
    var rectString = rect.top + ' ' + rect.left + ' ' + rect.bottom + ' ' + rect.right;
    pymChild.sendMessage(id + '-bounding-client-rect-return', rectString);

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

        if (typeof initMobile === 'undefined') {
            initMobile = true;
            document.querySelector('body').classList.add('init-mobile');
        }
    } else {
        isMobile = false;
        initMobile = false;
    }

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
