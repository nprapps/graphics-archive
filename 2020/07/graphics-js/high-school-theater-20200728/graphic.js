var $ = require("./lib/qsa");

var initDecades = require("./decades");
var initMusicals = require("./individual-musicals");
var initPlays = require("./individual-plays");
var initGeneric = require("./generic");

if ($.one("body#decades")) initDecades();
if ($.one("body#individualMusicals")) initMusicals();
if ($.one("body#individualPlays")) initPlays();
if ($.one("body#top10")) initGeneric();
