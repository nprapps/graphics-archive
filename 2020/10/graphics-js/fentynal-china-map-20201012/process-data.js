module.exports = function(territories, countries) {
  // incl countries that have territories
  var skipTerritories = new Set([
    "France",
    "United Kingdom",
    "Denmark",
    "Netherlands"
  ]);
  //incl territories that need to be separated
  var asCountry = new Set([
    "Puerto Rico",
    "Macau",
    "Hong Kong",
    "French Guiana",
    "French Polynesia",
    "St Martin",
    "Saint Barthelemy",
    "Guadeloupe",
    "Curacao",
    "Cayman Islands",
    "Aruba",
    "Montserrat",
    "Sint Maarten",
    "Greenland",
    "Isle of Man",
    "Guam",
    "Faroe Islands",
    "British Virgin Islands",
    "Turks and Caicos Islands",
    "Falkland Islands (Malvinas)",
    "Saint Pierre and Miquelon",
    "New Caledonia"
  ]);

  var aggregated = new Map();

  countries = countries.filter(c => c.confirmed);
  territories = territories.filter(c => c.confirmed);

  territories.forEach(function(p) {    
    if (asCountry.has(p.territory)) {
      p.name = p.territory;
    }; 

    var country = p.name; 

    if (country != p.territory && skipTerritories.has(country)) {
      return;
    }

    // update if it exists
    if (aggregated.has(country)) {
      var previous = aggregated.get(country);
      previous.confirmed += p.confirmed;
      previous.deaths += p.deaths;
      previous.recovered += p.recovered;
    } else {
      // otherwise store on first encounter
      aggregated.set(country, p);
    }
  });

  countries.forEach(function(c) {
    if (aggregated.has(c.name)) {
      return;
    } else {
      aggregated.set(c.name, c);
    }
  });

  //aggregated
  var final = Array.from(aggregated.values());

  for (var country of final) {
    var metadata = lookup[country.name];
    if (metadata) {
      Object.assign(country, metadata);
    }
  }

  console.log(final);

  return final;
};
