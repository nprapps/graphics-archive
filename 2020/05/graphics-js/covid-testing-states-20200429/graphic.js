var $ = require("./lib/qsa");

var initTable = require("./table");
var initUS = require("./us");
var initModels = require("./models");

if ($.one("body#table")) initTable();
if ($.one("body#us")) initUS();
if ($.one("body#models")) initModels();
