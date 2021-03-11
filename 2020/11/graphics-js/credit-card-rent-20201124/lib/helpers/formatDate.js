// Given November 7, 1981...

var getAPMonth = require("./getAPMonth");

var formatters = {
  // 81
  yearAbbrev: d => (d.getFullYear() + "").slice(-2),
  // 1981
  yearFull: d => d.getFullYear(),
  // 7, 1981
  dayYear: d => d.getDate() + ", " + d.getFullYear(),
  // Nov. 7
  monthDay: d => getAPMonth(d) + " " + d.getDate(),
  // Nov. 1981
  monthYear: d => getAPMonth(d) + " " + d.getFullYear(),
  // Nov. '81'
  monthYearAbbrev: d => getAPMonth(d) + " \u2019" + formatters.yearAbbrev(d),
  // Nov. 7, 1981
  dateFull: d => getAPMonth(d) + " " + formatters.dayYear(d)
};

module.exports = formatters;
