var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var pymChild = null;

var state = {
    totalClicks: 0
};

// Interval for animation timer
var gridAnimInterval;
var gridPhotoInterval;
// Transition duration for grid animations
var GRID_TRANSITION_DURATION = 1000;
var GRID_OVERALL_DURATION = 2500 + GRID_TRANSITION_DURATION;
var GRID_MOBILE_DURATION = GRID_OVERALL_DURATION + 3000
var ANIMS_ON = true;

var setState = function (props, cb) {
    // TODO: Decide if we need to polyfill Object.assign
    Object.assign(state, props);

    if (cb) {
        cb(state);
    }
};

var onWindowLoaded = function() {
  pym.then(child => {
      pymChild = child;
      render();

      window.addEventListener("resize", render);

      // child.sendHeight();

      // window.addEventListener("resize", () => child.sendHeight());
  });

}

var initWideGrid = function() {
    // Since randomness doesn't always look good, we're showing a pseudo-random
    // selection of highlighted items based on the array of object indexes below
    var animationFrames = [
        [2, 4, 9, 15, 17],
        [1, 7, 8, 13],
        [3, 5, 10, 12],
        [0, 6, 11, 14, 16],
    ];

    var gridItems = document.querySelectorAll(".artist");

    gridItems.forEach(function(d) {
        d.classList.remove('hide-woman', true);
    });

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

var initMobileGrid = function() {
    // Since randomness doesn't always look good, we're showing a pseudo-random
    // selection of highlighted items based on the array of object indexes below

    var animationFrames = [
        [0, 8],
        [4, 6],
        [2, 10]
    ];

    if (!state.mobileAnimating) {
        selectMobile();
        // gridPhotoInterval = window.setInterval(selectMobile, GRID_MOBILE_DURATION);
        state.mobileAnimating = true;
    }

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

var selectMobile = function() {
    var gridItems = document.querySelectorAll(".artist");
    var currentPhotoIndex = state.mobileFrame || 0;
    array = [0,1,2]

    gridItems.forEach(function(d,i) {
        counter = 0;
        if(i % 2 != array[currentPhotoIndex]) {
            var thisItem = d;
            // Add a class to distinguish animation highlighting from mouseover
            thisItem.classList.add('hide-woman', true);
        }
        else {
            var thisItem = d;
            // Remove class distinguishing animation highlight from mouseover
            thisItem.classList.remove('hide-woman');
        }
    });

    if (currentPhotoIndex == array.length - 1) {
        state.mobileFrame = 0;
    } else {
        state.mobileFrame = currentPhotoIndex + 1;
    }
}

var updateGridAnimation = function(animationFrames) {
    // Get the current animation frame index
    var currentFrameIndex = state.gridAnimationFrame || 0;

    // Get the array of object indexes to highlight, based on our current animation frame
    var selectedFrameArray = animationFrames[currentFrameIndex];

    // Loop through each grid item to determine whether it is in the array of items to highlight
    var gridItems = document.querySelectorAll(".artist");

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

var teardownWideGrid = function() {
    // Clear the timer and update state
    window.clearInterval(gridAnimInterval);
    animationFrames = []
    state.gridIsAnimating = false;
};

var teardownMobileGrid = function() {
    // Clear the timer and update state
    window.clearInterval(gridPhotoInterval);
    animationFrames = []
    state.mobileAnimating = false;
};

var render = function(containerWidth) {
    // if (!containerWidth) {
    //     containerWidth = DEFAULT_WIDTH;
    // }

    // if (containerWidth <= MOBILE_THRESHOLD) {
    //     isMobile = true;
    // } else {
    //     isMobile = false;
    // }

    if (isMobile.matches) {
        teardownWideGrid();
        initMobileGrid();
    }
    else {
        teardownMobileGrid();
        initWideGrid();
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


// Mouseover event function
var mouseoverGridArtist = function(el) {
    // Set a hover class on the current item, then highlight it
    var gridElement = el;
    // gridElement.classList.add('highlighted');
    gridElement.classList.add('has-hover');

    showArtistDetails(gridElement);
};

var mouseoutGridArtist = function(el) {
    // TODO don't remove class if it is highlighted from the animation?
    // Remove hover class on the current item, then un-highlight it
    // var gridElement = el;
    // gridElement.classList.remove('highlighted');

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

document.querySelectorAll(".artist").forEach(function(el, i) {
    if(isMobile.matches) {
        initMobileGrid(el, i)
    }
    el.addEventListener('mouseover', function(e) {
        if (!isMobile.matches) {
            mouseoverGridArtist(el);
        }
    });

    el.addEventListener('mouseout', function(e) {
        if (!isMobile.matches) {
            mouseoutGridArtist(el);
        }
    });
});


// wait for images to load
window.onload = onWindowLoaded;
