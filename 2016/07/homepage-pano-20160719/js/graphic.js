// Global vars
var pymChild = null;
var isMobile = false;
var isSafari = false;
var $body;
var $imgWrapper;
var $graphic;


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    detectBrowser();

    $body = document.querySelector('body')
    $imgWrapper = document.querySelector('.img-wrapper');
    $graphic = document.querySelector('#graphic');

    $imgWrapper.addEventListener('transitionend', onTransitionEnd, false);

    calculateGraphicHeight();

    var pymChild = new pym.Child({
        renderCallback: render
    })
}

/*
 * Render the graphic.
 */
var render = function() {
    calculateGraphicHeight();
    animateForward();
    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var calculateGraphicHeight = function() {
    var bodyWidth = getComputedStyle($body)['width'];
    bodyWidth = bodyWidth.substring(0, bodyWidth.length - 2);
    $graphic.style.height = Math.round(bodyWidth * 0.5625) + 'px';
    $imgWrapper.style.height = Math.round(bodyWidth * 0.5625) + 'px';
}

var calculateTranslatePercentage = function() {
    var newWidth = calculateImgWrapperWidth();
    var bodyWidth = getComputedStyle($body)['width'];
    bodyWidth = bodyWidth.substring(0, bodyWidth.length - 2);
    var difference = newWidth - bodyWidth;

    var translatePercentage = ((difference / newWidth) * 100).toString() + '%';
    $imgWrapper.style.width = newWidth + 'px';

    return translatePercentage;
}

var animateForward = function() {
    var translatePercentage = calculateTranslatePercentage();
    if (isSafari) {
        Velocity($imgWrapper, {
            translateX: '-' + translatePercentage,
        }, {
            duration: 60000,
            complete: animateBack,
            easing: 'linear'
        });
    } else {
        $imgWrapper.style.transform = 'translateX(-' + translatePercentage + ')';
    }
}

var animateBack = function() {
    if (isSafari) {
        Velocity($imgWrapper, {
            translateX: 0,
        }, {
            duration: 60000,
            complete: animateForward,
            easing: 'linear'
        });
    } else {
        $imgWrapper.style.transform = 'translateX(0)';
    }
}


var onTransitionEnd = function() {
    if (getComputedStyle($imgWrapper)['transform'] !== 'matrix(1, 0, 0, 1, 0, 0)') {
        animateBack();
    } else {
        animateForward();
    }
}

var calculateImgWrapperWidth = function() {
    var height = getComputedStyle($imgWrapper)['height'];
    height = height.substring(0, height.length - 2);
    return height * 3.084337349;
}

var detectBrowser = function() {
    if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
        var html = document.querySelector('html');
        if (html.classList) {
          html.classList.add('safari');
        }
        else {
          html.className += ' safari';
        }
        isSafari = true;
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
