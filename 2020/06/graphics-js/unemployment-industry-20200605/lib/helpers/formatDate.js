// Given November 7, 1981...

var getAPMonth = require("./getAPMonth");

var formatters = {
  // 81
  yearAbbrev: d => (d.getFullYear() + "").slice(-2),
  // 1981
  yearFull: d => d.getFullYear(),
  // 7, 1981
  dayYear: d => d.getDate() + ", " + d.getFullYear(),
  // Nov. 7, 1981
  dateFull: d => getAPMonth(d) + " " + formatters.dayYear(d),
  getAPMonth: d => getAPMonth(d)
};

module.exports = formatters;