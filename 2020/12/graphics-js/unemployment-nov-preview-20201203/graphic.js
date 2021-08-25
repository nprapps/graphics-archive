var $ = require("./lib/qsa");

// var initIndex = require("./index");
var initHistoricUnemployment = require("./unemployment");
var initHistoricPayroll = require("./payroll");


// if ($.one("body#index")) initIndex();
if ($.one("body#historic_unemployment")) initHistoricUnemployment();
if ($.one("body#historic-payroll")) initHistoricPayroll();
