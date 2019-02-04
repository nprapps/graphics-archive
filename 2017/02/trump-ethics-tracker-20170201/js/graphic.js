// Global vars
var pymChild = null;
var isMobile = false;
var timelineToggle = null;
var collapsedTimeline = null;
var pymHeightInterval = null;


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({
        renderCallback: render
    });

    pymChild.sendMessage('pym-ready', 'ready');

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
    
    pymChild.onMessage('scroll-to', function(promise) {
        pymChild.scrollParentToChildEl(promise);
    })

    timelineToggle = document.querySelectorAll('.timeline-toggle');
    collapsedTimeline = document.querySelectorAll('.collapsed-events');

    for (var i = 0; i < timelineToggle.length; i++) {
        timelineToggle[i].addEventListener('click', onTimelineToggleClick);
    }
    for (var i = 0; i < collapsedTimeline.length; i++) {
        collapsedTimeline[i].addEventListener('transitionend', onTimelineTransitionEnd);
    }
}

var onTimelineToggleClick = function(e) {
    e.preventDefault();
    this.classList.toggle('shown');

    var timeline = this.parentNode.querySelector('.collapsed-events');
    var latest = this.parentNode.querySelector('.latest-development').getAttribute('id');

    if (getComputedStyle(timeline)['height'] === '0px') {
        var animateHeight = getAnimateHeight(timeline);
        timeline.style.height = animateHeight + 'px';
        ANALYTICS.trackEvent('development-expand', latest);
    } else {
        if (document.documentElement.classList.contains('touchevents')) {
            pymChild.scrollParentToChildEl(latest);
        }
        timeline.style.height = 0;
        ANALYTICS.trackEvent('development-collapse', latest);
    }

    pymHeightInterval = setInterval(pymChild.sendHeight, 10);
}

var onTimelineTransitionEnd = function() {
    clearInterval(pymHeightInterval);
}


var getAnimateHeight = function(timeline) {
    var clonedTimeline = timeline.cloneNode(true);
    clonedTimeline.classList.add('cloned');
    var cloneWidth = timeline.offsetWidth

    Object.assign(clonedTimeline.style, {
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        visibility: 'hidden',
        height: 'auto',
        width: cloneWidth + 'px'
    });

    timeline.parentNode.appendChild(clonedTimeline);
    var height = outerHeight(clonedTimeline);

    var appendedNode = timeline.parentNode.querySelector('.cloned');
    timeline.parentNode.removeChild(appendedNode);

    return height;
}
/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Polyfill Object.assign
 */

if (typeof Object.assign != 'function') {
  Object.assign = function(target, varArgs) { // .length of function is 2
    'use strict';
    if (target == null) { // TypeError if undefined or null
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];

      if (nextSource != null) { // Skip over if undefined or null
        for (var nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

var outerHeight = function(el) {
  var height = el.offsetHeight;
  var style = getComputedStyle(el);

  height += parseInt(style.marginTop) + parseInt(style.marginBottom);
  return height;
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
