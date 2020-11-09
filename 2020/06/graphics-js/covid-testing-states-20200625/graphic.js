var $ = require("./lib/qsa");

var initTable = require("./table");
var initUS = require("./us");
var initGoals = require("./goals");

if ($.one("body#table")) initTable();
if ($.one("body#us")) initUS();
if ($.one("body#goals")) initGoals();
