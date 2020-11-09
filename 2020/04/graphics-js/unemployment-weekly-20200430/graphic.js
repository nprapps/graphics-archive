var $ = require("./lib/qsa");

var initTrendLine = require("./line-chart");

if ($.one("body.trend-line")) initTrendLine();
