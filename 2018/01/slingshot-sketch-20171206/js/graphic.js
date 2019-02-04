// Dev variable for testing
var ANIMS_ON = true;

// Global vars
// Note that we create and destroy a Pym child in an inline script in
// `child_template.html` to send the height to the parent ASAP.
var pymChild = null;
var isMobile = false;

// Container for the entire graphic.
var container;
// Flickity object
// TODO: Figure out if there's a way to not have to make this a global
var flkty;
var state = {
    totalClicks: 0
};

// Constants
// Collect values that are dependent on page markup in one place to more
// easily update if the markup changes.
// Selector for the container of the entire graphic
var CONTAINER_SEL = '#graphic';
// Selector for the container under which all the artist elements live
var ARTIST_COLLECTION_SEL = '.artist-collection';
// Selector for link to view more details about an artist
var ARTIST_LINK_SEL = '.artist-wrap';
// Selector for artist image
var ARTIST_IMAGE_SEL = '.artist-img-wrap img';
// Selector for the container element for a single artist
var ARTIST_SEL = '.artist-wrap';
// Class name for the mobile navigation container
var NAV_CLASSNAME = 'navigation';
// Selector for mobile navigation container
var NAV_SEL = '.' + NAV_CLASSNAME;
var LOADING_IMG_CLASSNAME = 'loading';

// Interval for animation timer
var gridAnimInterval;
// Transition duration for grid animations
var GRID_TRANSITION_DURATION = 1000;
var GRID_OVERALL_DURATION = 6000 + GRID_TRANSITION_DURATION;

/**
 * Update state.
 *
 * TODO: Document this function.
 *
 */
var setState = function (props, cb) {
    // TODO: Decide if we need to polyfill Object.assign
    Object.assign(state, props);

    if (cb) {
        cb(state);
    }
};


/**
 * Event handler for the `DOMContentLoaded` page lifecycle event.
 *
 * This event is fired when the browser has fully loaded HTML, and
 * the DOM tree is built, but external resources like pictures <img>
 * and stylesheets may not be loaded.
 */
var onDOMContentLoaded = function () {
    // Initialize the container global
    container = document.querySelector(CONTAINER_SEL);

    // Initialize the child Pym object so that we can send height ASAP.
    pymChild = new pym.Child({
        renderCallback: render
    });

    swapImages();

    // Send the height ASAP!
    // We do this so the iframe will resize and users will see that there's
    // a thing, even if it takes a bit to materialize.
    pymChild.sendHeight();

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

    setupArtistEvents();
}

/**
 * Replace initial tiny image with a normal size one to help achieve
 * a "blur up" effect.
 *
 * This approach is inspired by
 * https://jmperezperez.com/medium-image-progressive-loading-placeholder/
 */
var swapImages = function () {
    var images = document.querySelectorAll(ARTIST_IMAGE_SEL);
    images.forEach(function (img) {
        // Create a new image
        var imgLarge = new Image();
        // Get the `sizes`, `srcset` and `src` attributes from similarly-named
        // data attributes on the original image.
        imgLarge.sizes = img.dataset.sizes;
        imgLarge.srcset = img.dataset.srcset;
        imgLarge.src = img.dataset.src;
        // Set a class that will hide this image until it's loaded.
        imgLarge.className = LOADING_IMG_CLASSNAME;
        imgLarge.onload = function () {
            // When the large image is loaded, remove the original
            // from the DOM.
            img.parentNode.removeChild(img);
            // Remove the class that indicates that the image is loading.
            // CSS will cause the image to be shown.
            imgLarge.className = '';
        };
        // Add the image to the DOM in the same parent element as
        // the original image.
        img.parentNode.insertBefore(imgLarge, img.parentNode.firstChild);
    });
};

var setupArtistEvents = function() {
    // Get the URL of the Slingshot artists page. This is where this
    // graphic would normally be embedded. However, specifying this optional
    // URL parameter allows for the possibility of embedding the graphic on
    // another page and still having the links go to the artists page in
    // Seamus.
    var artistsUrl = getParameterByName('artistsUrl') || '';

    // Navigate the parent page when clicking on the artist grid.
    // We want to wire this up when the DOM is ready, rather than when all the
    // assets are loaded so our links work if a user is very eager to
    // click.
    document.querySelectorAll(ARTIST_LINK_SEL).forEach(function (el, i) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            var artistSlug = e.currentTarget.getAttribute('href').replace('#', '');
            var url = artistsUrl + '#' + artistSlug;
            pymChild.navigateParentTo(url);

            setState({
                totalClicks: state.totalClicks + 1
            }, function (newState) {
                trackArtistLinkClick(
                    artistSlug,
                    i,
                    newState.totalClicks,
                    isMobile
                );
            });
        });
    });

    // Add event listener for artist hover events on wide screens
    document.querySelectorAll(ARTIST_SEL).forEach(function(el) {
        el.addEventListener('mouseover', function(e) {
            if (!isMobile) {
                mouseoverGridArtist(el);
            }
        });

        el.addEventListener('mouseout', function(e) {
            if (!isMobile) {
                mouseoutGridArtist(el);
            }
        });
    });
};

/**
 * Track the click of an artist link.
 *
 * Track the click of an artist link using Google Analytics.
 *
 * @param {string} slug - Artist slug.
 * @param {integer} i - Index of artist within the collection.
 * @param {integer} totalClicks - Total number of clicks on artists links in
 *   this session.
 * @param {boolean} isMobile - `true` if we're showing a mobile display,
 *   otherwise false.
 *
 */
var trackArtistLinkClick = function (slug, i, totalClicks, isMobile) {
    var view = isMobile ? 'deck' : 'grid';
    ANALYTICS.trackEvent('click-artist-' + view + "-slug", slug);
    ANALYTICS.trackEvent('click-artist-' + view + "-index", i.toString());
    ANALYTICS.trackEvent('click-artist-total-clicks', totalClicks.toString());
};

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // TODO Do something about the details showing up before images have loaded
    // Keep animation from starting until images have loaded -- kick off in a callback
    // to window onload?

    if (isMobile) {
        teardownWideGrid();
        initMobile();
    }
    else {
        teardownMobile();
        initWideGrid();
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Initialize grid animation effect
 */
var initWideGrid = function() {
    // Since randomness doesn't always look good, we're showing a pseudo-random
    // selection of highlighted items based on the array of object indexes below
    var animationFrames = [
        [2, 4, 9, 15, 17, 22, 24, 29, 35, 37, 42, 44, 49],
        [1, 7, 8, 13, 19, 21, 27, 28, 33, 39, 41, 47, 48],
        [3, 5, 10, 12, 18, 23, 25, 30, 32, 38, 43, 45, 50],
        [0, 6, 11, 14, 16, 20, 26, 31, 34, 36, 40, 46],
    ];

    // If is not already animating, then init animation
    if (!state.gridIsAnimating) {
        // Show the first set of highlighted images, then create the interval to repeat
        updateGridAnimation(animationFrames);
        if (ANIMS_ON) {
            gridAnimInterval = window.setInterval(updateGridAnimation, GRID_OVERALL_DURATION, animationFrames);
        }

        // Set state to indicate animation is underway
        state.gridIsAnimating = true;
    }
};

var teardownWideGrid = function() {
    // Clear the timer and update state
    window.clearInterval(gridAnimInterval);
    state.gridIsAnimating = false;
};

/*
 * Change the current "frame" of the highlighted grid items.
 */
var updateGridAnimation = function(animationFrames) {
    // Get the current animation frame index
    var currentFrameIndex = state.gridAnimationFrame || 0;

    // Get the array of object indexes to highlight, based on our current animation frame
    var selectedFrameArray = animationFrames[currentFrameIndex];

    // Loop through each grid item to determine whether it is in the array of items to highlight
    var gridItems = document.querySelectorAll(ARTIST_SEL);

    gridItems.forEach(function(d,i) {
        // If it's in the array of highlighted items...
        if (selectedFrameArray.indexOf(i) !== -1) {
            // Set a delay before highlighting
            setTimeout(function() {
                var thisItem = d;
                // Add a class to distinguish animation highlighting from mouseover
                thisItem.classList.add('has-grid-highlight');

                showArtistDetails(thisItem);
            }, GRID_TRANSITION_DURATION);
        } else {
            // Make all other items un-highlighted, unless user is currently mousing over
            var thisItem = d;
            if (!thisItem.classList.contains('has-hover')) {
                hideArtistDetails(thisItem);
            }

            // Remove class distinguishing animation highlight from mouseover
            thisItem.classList.remove('has-grid-highlight');
        }
    });

    // Increment the animation frame number or start over if at the end
    if (currentFrameIndex == animationFrames.length - 1) {
        state.gridAnimationFrame = 0;
    } else {
        state.gridAnimationFrame = currentFrameIndex + 1;
    }
};

// Mouseover event function
var mouseoverGridArtist = function(el) {
    // Set a hover class on the current item, then highlight it
    var gridElement = el;
    gridElement.classList.add('has-hover');

    showArtistDetails(gridElement);
};

var mouseoutGridArtist = function(el) {
    // TODO don't remove class if it is highlighted from the animation?
    // Remove hover class on the current item, then un-highlight it
    var gridElement = el;
    gridElement.classList.remove('has-hover');

    // Don't un-highlight it if it's been currently selected in the animation
    if (!gridElement.classList.contains('has-grid-highlight')) {
        hideArtistDetails(gridElement);
    }
};

// Set class to show artist details
var showArtistDetails = function(el) {
    el.classList.add('highlighted', true);
};

// Remove class to hide artist details
var hideArtistDetails = function(el) {
    el.classList.remove('highlighted', false);
};

/**
 * Initialize mobile behavior.
 */
var initMobile = function () {
    var container = document.querySelector(ARTIST_COLLECTION_SEL);
    // Initialize Flickity carousel.
    flkty = new Flickity(container, {
        cellSelector: ARTIST_SEL,
        // Disable accessibility to prevent a weird iOS bug, documented in Issue #12
        accessibility: false,
        // Enable dragging and flicking
        draggable: true,
        // Hide page dots as we'll render our own pager
        pageDots: false,
        // Don't set the gallery height to that of the tallest cell. We'll
        // handle height ourselves via CSS.
        setGallerySize: true,
        // Show the currently selected cell at the center of the container
        cellAlign: 'center',
        // Disable previous and next buttons
        prevNextButtons: false,
        // Dragging doesn't start until 30px has moved.
        // This allows for more wiggle room for vertical page scrolling on touch
        // devices.
        dragThreshold: 30
    })
    flkty.on('select', onSelectArtist);


    setState({
        selectedArtistIndex: 0,
        numArtists: container.querySelectorAll(ARTIST_SEL).length
    }, function (newState) {
        renderNav(container, {
            selectedArtistIndex: newState.selectedArtistIndex,
            numArtists: newState.numArtists
        });
    });
};

/**
 * Remove swipeable functionality.
 */
var teardownMobile = function () {
    var nav;

    if (flkty) {
        // Remove Flickity functionality completely
        // This removes container elements that were added as well as inline
        // styles on the carousel items.
        flkty.destroy();
    }

    // If the navigation element exists, remove it from the DOM.
    nav = container.querySelector(NAV_SEL);
    if (nav) {
        nav.parentNode.removeChild(nav);
    }
};

/**
 * Handle for Flickity `select` event.
 *
 * See https://flickity.metafizzy.co/events.html.
 */
var onSelectArtist = function () {
    // Flickity binds `this` to the Flickity object to which this event handler
    // was connected.
    // Assign it to a variable whose name makes what's going on more clear.
    var flkty = this;

    setState({
        selectedArtistIndex: flkty.selectedIndex,
        selectedArtistSlug: flkty.selectedElement.getAttribute('href').replace('#', '')
    }, function (newState) {
        renderNav(container, {
            selectedArtistIndex: newState.selectedArtistIndex,
            numArtists: newState.numArtists
        });
        ANALYTICS.trackEvent('view-artist-card-slug', newState.selectedArtistSlug);
        ANALYTICS.trackEvent('view-artist-card-index', newState.selectedArtistIndex.toString());
    });
};

/**
 * Render navigation controls for card-stack view.
 */
var renderNav = function (container, props) {
    var nav = container.querySelector(NAV_SEL);

    if (!nav) {
        nav = createNav(props);
        container.appendChild(nav);
    }

    updateNav(nav, props);
};

/**
 * Update the nav element.
 */
var updateNav = function (container, props) {
    container.querySelector('.current').innerHTML = props.selectedArtistIndex + 1;
    container.querySelector('.total').innerHTML = props.numArtists;

    // If needed, set disabled styles for next/previous buttons
    ['next', 'prev'].forEach(function (direction) {
        var newClassName = getArrowClassName(
            direction,
            props.selectedArtistIndex,
            props.numArtists
        );
        var el = container.querySelector('.arrow-' + direction);
        el.className = newClassName;
    });
};

/**
 * Get class names for next/previous arrow buttons.
 */
var getArrowClassName = function (direction, currentIndex, numArtists) {
    var base = 'arrow arrow-' + direction;

    if ((direction == 'prev' && currentIndex == 0) ||
         direction == 'next' && currentIndex == numArtists - 1) {
        return base + ' disabled';
    }

    return base;
};

/**
 * Create a new DOM element for the navigation controls for the card-stack
 * view.
 */
var createNav = function () {
    var nav = document.createElement('div');

    nav.className = NAV_CLASSNAME;

    // TODO: Use button elements instead of spans
    nav.innerHTML = '<span class="arrows arrow-prev disabled">' +
      '<span class="prev icon-angle-left" aria-hidden="true"></span>' +
      '</span>' +
      '<div class="status">' +
      '<span class="current"></span> of <span class="total"></span>' +
      '</div>' +
      '<span class="arrows arrow-next">' +
      '<span class="next icon-angle-right" aria-hidden="true"></span>' +
      '</span>';


    nav.querySelector('.prev').addEventListener('click', onClickPrev);
    nav.querySelector('.next').addEventListener('click', onClickNext);

    return nav;
};

/**
 * Event handler for clicking the next button.
 */
var onClickNext = function (evt) {
    ANALYTICS.trackEvent('click-next', state.selectedArtistIndex.toString());
    if (state.selectedArtistIndex == state.numArtists - 1) {
        return;
    }

    showArtist(state.selectedArtistIndex + 1);
};

/**
 * Event handler for clicking the previous button.
 */
var onClickPrev = function (evt) {
    ANALYTICS.trackEvent('click-prev', state.selectedArtistIndex.toString());
    if (state.selectedArtistIndex == 0) {
        return;
    }

    showArtist(state.selectedArtistIndex - 1);
};

/**
 * Show the artist at a specified index.
 */
var showArtist = function (newIndex) {
    setState({
        selectedArtistIndex: newIndex
    }, function (newState) {
        flkty.select(newState.selectedArtistIndex);
    });
};

/*
 * Polyfill for NodeList.forEach
 */
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

// Wire up page lifecycle event handlers
document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
