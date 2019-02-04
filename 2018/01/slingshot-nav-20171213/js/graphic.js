// Global vars
var pymChild = null;
// Selector for our list of year lengths.
var YEAR_LIST_CONTAINER_SEL = '.slingshot-nav';

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    // Highlight the active year
    var activeYear = getParameterByName('year');

    if (activeYear) {
        // Add a class to the year specified by the query parameter
        var yearItemSel = YEAR_LIST_CONTAINER_SEL + ' [data-year="' +
          activeYear + '"]';
        document.querySelector(yearItemSel).classList.add('selected');
    }

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

    // Navigate the parent page.
    var navLinkSel = YEAR_LIST_CONTAINER_SEL + ' a';
    document.querySelectorAll(navLinkSel).forEach(function (el) {
      el.addEventListener('click', function (e) {
          e.preventDefault();
          var url = e.target.getAttribute('href');
          pymChild.navigateParentTo(url);
      });
    });
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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
