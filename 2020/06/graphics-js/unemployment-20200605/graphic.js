var $ = require("./lib/qsa");

// var initIndex = require("./index");
var initRace = require("./race");
var initHistoricUnemployment = require("./unemployment");
var initHistoricPayroll = require("./payroll");


// if ($.one("body#index")) initIndex();
if ($.one("body#race")) initRace();
if ($.one("body#historic_unemployment")) initHistoricUnemployment();
if ($.one("body#historic-payroll")) initHistoricPayroll();
