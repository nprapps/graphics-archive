var { csvParse } = require("d3-dsv/dist/d3-dsv.min");
var { getAPMonth } = require("./lib/helpers");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-geo/dist/d3-geo.min")
};

var monthLengths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var inDays = function(dateString) {
  var [m, d, y] = dateString.split("/").map(Number);
  var days = 0;
  for (var i = 0; i < m - 1; i++) {
    days += monthLengths[i];
  }
  days += d;
  return days;
};

var epsilon = 0.000001;

var getTimeStamp = function(date) {
  // format timestamp...
  var hours = date.getHours();
  var minutes = date.getMinutes() + "";
  var suffix = "a.m.";

  if (hours >= 13) {
    suffix = "p.m.";
    hours -= 12;
  }
  if (hours == 0) {
    hours = 12;
  }

  var month = date.getMonth();

  var time = `${hours}:${minutes.padStart(2, "0")} ${suffix}`;
  var day = `${getAPMonth(date)} ${date.getDate()}`

  return `${time} on ${day}`;
};

const arrayToObject = function(array, key) {
  var o = {};
  array.forEach(item => o[item[key]] = item);
  return o;
};

var isPlural = function(d) {
  if (d == 1) {
    return "";
  } else {
    return "s";
  }
};

var DATA_URL_CSV =
  "https://apps.npr.org/dailygraphics/graphics/coronavirus-d3-us-map-20200312/states.csv";
// automatic data
var DATA_URL_JSON = "https://apps.npr.org/dailygraphics/data/jhu-covid-19/arcgis.json";


var getData = async function(source) {
  var local = window.DATA;
  var lookup = {};
  local.forEach(s => lookup[s.state_jhu] = s);
  switch (source) {
    case "csv":
      var response = await fetch(DATA_URL_CSV, { cache: "no-cache" });
      var csv = await response.text();
      var updated = new Date(Date.parse(response.headers.get("last-modified")));
      var data = csvParse(csv, function(d) {
        return {
          ...lookup[d.state],
          confirmed: Number(d.confirmed),
          deaths: Number(d.deaths),
          state: d.state,
        };
      });
      return { data, updated };
    break;

    case "json":
      var response = await fetch(DATA_URL_JSON, { cache: "no-cache" });
      var json = await response.json();
      var us = json.features.filter(f => f.Country_Region == "US");
      var last = 0;
      var data = us.map(function(item) {
        var state = item.Province_State;
        var match = lookup[state];
        if (!match) return null;
        var confirmed = item.Confirmed;
        var deaths = item.Deaths;
        var time = item.Last_Update;
        if (time > last) last = time;
        console.log(time);
        return {
          ...match,
          confirmed,
          deaths,
          state: match.state
        }
      }).filter(d => d);
      var updated = last ? new Date(last) : false;
      return { data, updated };
    break;

    default:
      // just use the window
      return { data: local };
  }
}

var updateTime = function(time) {
  // update timestamps, overriding google sheets
  document.querySelectorAll(".latestTime").forEach(d => (d.textContent = time));
};

var multiplex = function(streams) {
  const n = streams.length;
  return {
    point(x, y) { for (const s of streams) s.point(x, y); },
    sphere() { for (const s of streams) s.sphere(); },
    lineStart() { for (const s of streams) s.lineStart(); },
    lineEnd() { for (const s of streams) s.lineEnd(); },
    polygonStart() { for (const s of streams) s.polygonStart(); },
    polygonEnd() { for (const s of streams) s.polygonEnd(); }
  };
}

var geoAlbersUsaPr = function() {
  var cache,
      cacheStream,
      lower48 = d3.geoAlbers(), lower48Point,
      alaska = d3.geoConicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]),
      alaskaPoint,
      hawaii = d3.geoConicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]),
      hawaiiPoint,
      puertoRico = d3.geoConicEqualArea().rotate([66, 0]).center([0, 18]).parallels([8, 18]),
      puertoRicoPoint,
      point,
      pointStream = {point: function(x, y) { point = [x, y]; }};

  function albersUsa(coordinates) {
    var x = coordinates[0], y = coordinates[1];
    return point = null,
        (lower48Point.point(x, y), point)
        || (alaskaPoint.point(x, y), point)
        || (hawaiiPoint.point(x, y), point)
        || (puertoRicoPoint.point(x, y), point);
  }

  albersUsa.invert = function(coordinates) {
    var k = lower48.scale(),
        t = lower48.translate(),
        x = (coordinates[0] - t[0]) / k,
        y = (coordinates[1] - t[1]) / k;
    return (y >= 0.120 && y < 0.234 && x >= -0.425 && x < -0.214 ? alaska
        : y >= 0.166 && y < 0.234 && x >= -0.214 && x < -0.115 ? hawaii
        : y >= 0.204 && y < 0.234 && x >= 0.320 && x < 0.380 ? puertoRico
        : lower48).invert(coordinates);
  };

  albersUsa.stream = function(stream) {
    return cache && cacheStream === stream ? cache : cache = multiplex([lower48.stream(cacheStream = stream), alaska.stream(stream), hawaii.stream(stream), puertoRico.stream(stream)]);
  };

  albersUsa.precision = function(_) {
    if (!arguments.length) return lower48.precision();
    lower48.precision(_), alaska.precision(_), hawaii.precision(_), puertoRico.precision(_);
    return reset();
  };

  albersUsa.scale = function(_) {
    if (!arguments.length) return lower48.scale();
    lower48.scale(_), alaska.scale(_ * 0.35), hawaii.scale(_), puertoRico.scale(_);
    return albersUsa.translate(lower48.translate());
  };

  albersUsa.translate = function(_) {
    if (!arguments.length) return lower48.translate();
    var k = lower48.scale(), x = +_[0], y = +_[1];

    lower48Point = lower48
        .translate(_)
        .clipExtent([[x - 0.455 * k, y - 0.238 * k], [x + 0.455 * k, y + 0.238 * k]])
        .stream(pointStream);

    alaskaPoint = alaska
        .translate([x - 0.307 * k, y + 0.201 * k])
        .clipExtent([[x - 0.425 * k + epsilon, y + 0.120 * k + epsilon], [x - 0.214 * k - epsilon, y + 0.234 * k - epsilon]])
        .stream(pointStream);

    hawaiiPoint = hawaii
        .translate([x - 0.205 * k, y + 0.212 * k])
        .clipExtent([[x - 0.214 * k + epsilon, y + 0.166 * k + epsilon], [x - 0.115 * k - epsilon, y + 0.234 * k - epsilon]])
        .stream(pointStream);

    puertoRicoPoint = puertoRico
        .translate([x + 0.350 * k, y + 0.224 * k])
        .clipExtent([[x + 0.320 * k, y + 0.204 * k], [x + 0.380 * k, y + 0.234 * k]])
        .stream(pointStream);

    return reset();
  };

  function reset() {
    cache = cacheStream = null;
    return albersUsa;
  }

  return albersUsa.scale(1070);
}

module.exports = {
  getTimeStamp,
  arrayToObject,
  isPlural,
  getData,
  updateTime,
  geoAlbersUsaPr,
  inDays
}
