// Global vars
var pymChild = null;
var isMobile = false;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    initEventListeners();

    pymChild = new pym.Child({
        renderCallback: render
    });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= TINY_THRESHOLD) {
        isTiny = true;
    } else {
        isTiny = false;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    setInitialPromiseVisibility();

    if (!isTiny) {
        setEqualTextHeights();
    } else {
        unsetEqualTextHeights();
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var initEventListeners = function() {
    var categoryCounts = document.querySelectorAll('.promise-count');

    categoryCounts.forEach(function(el, i) {
        el.addEventListener('click', function(e) {
            e.preventDefault();

            if (isMobile) {
                showPromiseInfo(el);
            } else {
                var correspondingAnchor = this.parentNode.querySelector('.promise-link');
                navigateToAnchor(e, correspondingAnchor);
            }
        });

        el.addEventListener('mouseover', function(e) {
            showPromiseInfo(el);
        });
    });

    var promiseLinks = document.querySelectorAll('.promise-link');

    promiseLinks.forEach(function(el, i) {
        el.addEventListener('click', function(e) {
            navigateToAnchor(e, this);
        });
    });
};

var navigateToAnchor = function(e, thisSelection) {
    e.preventDefault();
    var thisAnchor = thisSelection.dataset.scroll;
    pymChild.scrollParentTo(thisAnchor);
};

var setInitialPromiseVisibility = function() {
    if (isMobile) {
        var categories = document.querySelectorAll('.category');
        categories.forEach(function(el, i) {
            if (!el.querySelector('.active')) {
                el.querySelector('.promise-title-wrapper').classList.add('active');
            }
        });
    } else {
        var activeElement = document.querySelector('.promise-title-wrapper.active');
        var elementToHighlight;

        if (!activeElement) {
            elementToHighlight = document.querySelector('.promise-title-wrapper');
        } else {
            elementToHighlight = activeElement;
        }

        showPromiseInfo(elementToHighlight);
    }
};

var showPromiseInfo = function(el) {
    var otherPromises;

    if (isMobile) {
        otherPromises = el.parentNode.parentNode.querySelectorAll('.promise-title-wrapper.active');
    } else {
        otherPromises = document.querySelectorAll('.promise-title-wrapper.active');
    }

    otherPromises.forEach(function(d,i) {
        d.classList.remove('active');
    });

    //setArrowPos(el);
    el.parentNode.querySelector('.promise-title-wrapper').classList.add('active');
};

var setArrowPos = function(el) {
    var wrapperBounds = el.getBoundingClientRect();
    var thisPos = wrapperBounds.x + (wrapperBounds.width / 2);

    el.parentNode.querySelector('.promise-title-wrapper:before').style.left(thisPos + 'px');
};

var setEqualTextHeights = function() {
    var textBoxes = document.querySelectorAll('.category-text');
    var maxHeight = 0;

    textBoxes.forEach(function(d,i) {
        d.style.height = 'auto';

        var boxHeight = d.getBoundingClientRect().height;
        if (boxHeight > maxHeight) {
            maxHeight = boxHeight;
        }
    });

    textBoxes.forEach(function(d,i) {
        d.style.height = maxHeight + 'px';
    });
};

var unsetEqualTextHeights = function() {
    var textBoxes = document.querySelectorAll('.category-text');

    textBoxes.forEach(function(d,i) {
        d.style.height = 'auto';
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
