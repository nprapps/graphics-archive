var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var $ = require("./lib/qsa");

console.clear();

pym.then(child => {
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
});

var presets = {
  starting: {
    r: 55,
    efficacy: 95,
    immunity: 0
  },
  baseline: {
    immunity: 0
  },
  lowImmunity: {
    immunity: 10
  },
  highImmunity: {
    immunity: 25
  },
  infectious: {
    r: 95,
    immunity: 0,
    efficacy: 75
  }
}

var initialPlay = true;

var Simulation = require("./simulation");

var container = $.one(".graphic");
var here = new URL(window.location);
var presetKey = container.dataset.preset || here.searchParams.get("preset");
var startup = Object.assign({}, presets.starting);
if (presetKey) {
  Object.assign(startup, presets[presetKey]);
}

var vaxControls = $.one(".vax-controls");
var vaxRates = {
  low: 5,
  medium: 30,
  high: 75
}

var seed = 1613168806122;
// seed = Date.now();
var rates = [vaxRates.low, vaxRates.medium, vaxRates.high];
var triplets = $(".triplets .item").map(function(container, i) {
  var svg = $.one("svg", container);
  var vax = rates[i];
  var width = 20;
  var height = 20;
  var config = Object.assign(startup, { seed, vax, width, height });
  return {
    sim: new Simulation(svg, config),
    status: $.one(".status", container),
    item:  $.one("h4", container),
    update: function() {

      this.item.innerHTML = `${this.sim.config.vax}% vaccinated`;
      var counts = this.sim.countHexes();
      var values = {
        sick: counts.infected + counts.recovered,
        healthy: counts.normal + counts.immune
      };

      for (var k in values) {
        var span = $.one(`[data-status="${k}"]`, this.status);
        span.innerHTML = values[k];
      }
    },
    svg
  };
});

var playButton = $.one(".play");

triplets.forEach(t => {
  t.update();
  t.svg.addEventListener("tick", () => t.update());
  t.svg.addEventListener("stabilized", function() {
    if (triplets.every(t => !t.sim.playing)) {
      playButton.innerHTML = "Run Again";
    }
  });
});

var wait = d => new Promise(ok => setTimeout(ok, d));

playButton.addEventListener("click", async function() {
  this.innerHTML = "Running...";
  if (initialPlay) {
    initialPlay = false;
  } else {
    onReset();
    await wait(300);
  }
  triplets.forEach(function(t) {
    if (t.sim.playing) return;
    t.sim.start();
  })
});

var onReset = function() {
  var seed = Date.now();
  triplets.forEach(t => {
    t.sim.reset(seed);
    t.item.innerHTML = `${t.sim.config.vax}% vaccination rate`;
    t.update();
  });
};

// $.one(".reset").addEventListener("click", onReset);

var setPreset = function() {
  var key = this.dataset.preset;
  var config = Object.assign({}, presets.starting, presets[key]);
  console.log(config);
  var seed = Date.now();
  triplets.forEach(function(t) {
    Object.assign(t.sim.config, config);
    t.sim.reset(seed);
  });
  onReset();
};

$("button.preset").forEach(b => b.addEventListener("click", setPreset));
