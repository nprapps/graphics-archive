var $ = require("./lib/qsa");

// var initIndex = require("./index");
var initRace = require("./race");
var initHistoricUnemployment = require("./historic_unemployment");
var initHistoricPayroll = require("./historic-payroll");


// if ($.one("body#index")) initIndex();
if ($.one("body#race")) initRace();
if ($.one("body#historic_unemployment")) initHistoricUnemployment();
if ($.one("body#historic-payroll")) initHistoricPayroll();
