var $ = require("./lib/qsa");

// var initIndex = require("./index");
var initHistoricUnemployment = require("./unemployment");
var initHistoricPayroll = require("./payroll");
var initCumulativePayroll = require("./cumulative_payroll");


// if ($.one("body#index")) initIndex();
if ($.one("body#historic_unemployment")) initHistoricUnemployment();
if ($.one("body#historic-payroll")) initHistoricPayroll();
if ($.one("body#cumulative-payroll")) initCumulativePayroll();
