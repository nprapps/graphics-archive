var $ = require("./lib/qsa");

var initDataTable = require("./data-table");
var initStateMap = require("./hexmap");

if ($.one("body.data-table")) initDataTable();
if ($.one("body.state-map")) initStateMap();
