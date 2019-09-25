/*
 * Base Javascript code for graphics, including D3 helpers.
 */

// Global config
var DEFAULT_WIDTH = 300;
var MOBILE_THRESHOLD = 500;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');
var fmtMonthNum = d3.time.format('%m');

var formatFullDate = function(d) {
    // Output example: Dec. 23, 2014
    var fmtDayYear = d3.time.format('%e, %Y');
    return getAPMonth(d) + ' ' + fmtDayYear(d).trim();
};

var fmtNumSI = function(d) {
	if (d == 0) {
		return "0";
	}
	return d3.format(".2s")(d);
};

var fmtNumSIMillions = function (d, mobile) {
	if (d == 0) {
		return "0";
	}
	var val = fmtNumSI(d);
	if (val.indexOf("M") !== -1) {
		if (!mobile) { 
			val = val.replace("M", " million"); 
		}
	} else {		
		val = d3.format("s")(d/100);
		if (!mobile) {
			val = val.replace("k", " million");
		} else {
			val = val.replace("k", "M");
		}
		val = "0." + val;
	}
	return val;
};