/*
 * Basic Javascript helpers used in analytics.js and graphics code.
 *
 * This has been modified from the default helpers.js to remove unused values
 * for optimal performance.
 *
 * The following elements were removed:
 *
 * * COLORS
 * * classify
 * * formatStyle
 * * makeTranslate
 * * getAPMonth
 * * wrapText
 * * getLocation
 * * isProduction
 * * String.trim polyfill
 */


/*
 * Parse a url parameter by name.
 * via: http://stackoverflow.com/a/901144
 */
var getParameterByName = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}


/*
 * Convert a url to a location object.
 */
var urlToLocation = function(url) {
    var a = document.createElement('a');
    a.href = url;
    return a;
}
