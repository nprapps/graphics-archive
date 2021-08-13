module.exports = function(COPY) {
  // process the data
  var byName = {};
  var current = [];
  var byStance = {};
  var byRating = {};

  // defined manually to preserve order
  var ratings = [
    "Solid Democratic",
    "Likely Democratic",
    "Lean Democratic",
    "Toss-Up Democratic",
    "Toss-Up Republican",
    "Likely Republican",
    "Solid Republican"
  ];

  COPY.statements.forEach(function(row) {
    if (!row.stance) return;
    var { name, date } = row;
    // turn dates into Date objects
    if (date && date != "Invalid Date") {
      var unix = Date.parse(date);
      var jsDate = new Date(unix);
      row.date = jsDate;
    } else {
      row.date = null;
    }

    // add to the listings by name
    if (!byName[name]) byName[name] = [];
    byName[name].push(row);
  });

  // for each congrescritter
  for (var n in byName) {
    // sort stances in reverse-chronological order
    var history = byName[n].sort(function(a, b) {
      return a.date - b.date;
    });
    // get the most recent stance
    var latest = history[history.length - 1];
    // create a person object from that
    var person = { ...latest, history };
    // add Cook rating data

    // load and merge district ratings from Cook
    var cook = COPY.districts[person.name];
    if (cook) {
      person.rating = cook.rating;
      person.lean = cook.lean;
      var [party, rating] = cook.lean.split("+");
      rating = rating * 1 || 0;
      person.leanParty = party;
      person.leanRating = party == "D" ? rating : 0 - rating;
    }

    // merge this back onto the byName object
    byName[n] = person;
    current.push(person);

    // add to stance/rating lookups
    var { stance } = person;
    if (!byStance[stance]) byStance[stance] = [];
    byStance[stance].push(person);
    if (!byRating[person.rating]) byRating[person.rating] = [];
    byRating[person.rating].push(person);
  }

  var stances = Object.keys(byStance);

  return {
    byStance,
    byRating,
    byName,
    current,
    ratings,
    stances
  }
}