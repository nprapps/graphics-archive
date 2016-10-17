/*
 * Base Javascript code for graphics, including D3 helpers.
 */

// Global config
var DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');
var fmtMonthFull = d3.time.format('%b');
var fmtMonthNum = d3.time.format('%m');

// format month abbrs in AP style
var getAPMonth = function(dateObj) {
    var apMonths = [ 'Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.' ];
    var thisMonth = +fmtMonthNum(dateObj) - 1;
    return apMonths[thisMonth];
}
