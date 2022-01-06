// Given November 7, 1981...

var getAPMonth = require("./getAPMonth");

let options_monthYear = { year: 'numeric', month: 'long' };

var formatters = {
  // 81
  yearAbbrev: d => (d.getFullYear() + "").slice(-2),
  // 1981
  yearFull: d => d.getFullYear(),
  // 7, 1981
  dayYear: d => d.getDate() + ", " + d.getFullYear(),
  // Nov. 7
  monthDay: d => getAPMonth(d) + " " + d.getDate(),
  // November 1981
  monthYear: d => d.toLocaleString("en-US", options_monthYear),
  // Nov. 7, 1981
  dateFull: d => getAPMonth(d) + " " + formatters.dayYear(d)
};

module.exports = formatters;
