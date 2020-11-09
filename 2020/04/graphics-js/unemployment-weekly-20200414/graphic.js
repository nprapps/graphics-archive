var $ = require("./lib/qsa");

var initDataTable = require("./data-table");
var initTrendLine = require("./line-chart");

if ($.one("body.data-table")) initDataTable();
if ($.one("body.trend-line")) initTrendLine();
