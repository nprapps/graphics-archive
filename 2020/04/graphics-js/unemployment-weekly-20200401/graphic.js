var $ = require("./lib/qsa");

var initDataTable = require("./data-table");
var initStateMap = require("./hexmap");
var initTrendLine = require("./line-chart");

if ($.one("body.data-table")) initDataTable();
if ($.one("body.state-map")) initStateMap();
if ($.one("body.trend-line")) initTrendLine();
