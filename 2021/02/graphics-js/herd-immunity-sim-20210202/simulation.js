const HEX_SIZE = 20;
const HALF_HEX = HEX_SIZE / 2;
const WIDTH = HALF_HEX * Math.sqrt(3);
const HEIGHT = HEX_SIZE * .75;
const TAU = Math.PI * 2;
const SLICE = TAU / 6;
const SPIN = Math.PI * -.5;
const GRID_WIDTH = 30;
const GRID_HEIGHT = 30;
const SEED_COUNT = 3;

const NORMAL = "normal";
const INFECTED = "infected";
const RECOVERED = "recovered";
const VACCINATED = "vaccinated";
const IMMUNE = "immune";

class PRNG {
  constructor(seed) {
    console.log(seed);
    this.value = seed;
    this.counter = 1;
  }

  reseed(seed) {
    console.log(seed);
    this.value = seed;
    this.counter = 1;
  }

  random() {
    // adapting the book of shaders PRNG
    var value = (Math.sin(this.value * 12.9898) + this.counter++ * 78.233) * 43758.5453123;
    // biased - do not leave in place, only for testing
    // value = (Math.sin(this.value * 12.9898 * 78.233));
    var rounded = Math.floor(value);
    value = value - rounded;
    this.value = value;
    return value;
  }
}

var testPRNG = new PRNG(Date.now());
var tests = [];
var runs = 1000;
for (var i = 0; i < runs; i++) {
  tests.push(testPRNG.random());
}
var counts = new Array(20).fill(0);
tests.forEach(t => counts[Math.floor(t * counts.length)]++);
var average = counts.reduce((v, t) => v + t, 0) / counts.length;
var ideal = runs / counts.length;
var bars = " ▁▂▃▄▅▆▇█".split("");
var deviation = counts.map(c => c - ideal);
var spark = v => bars[4 + Math.floor(v / ideal * 3)];
console.log(`PRNG distribution check: |${deviation.map(spark).join("")}|`);

class Simulation {
  constructor(svg, config) {
    this.config = Object.assign({}, config);
    this.prng = new PRNG(config.seed || Date.now());
    this.svg = svg;
    this.createHexes(config.width || GRID_WIDTH, config.height || GRID_HEIGHT);
    this.assignStates();
    this.history = [];
    this.tick = this.tick.bind(this);
  }

  clamp(value, length) {
    return value < 0 ? length + value : value % length;
  }

  getHex(x, y, wrap) {
    if (wrap) {
      y = this.clamp(y, this.hexes.length);
    }
    var row = this.hexes[y];
    if (!row) return null;
    if (wrap) {
      x = this.clamp(x, row.length);
    }
    var cell = row[x];
    return cell || null;
  }

  getNeighbors(x, y, wrap) {
    var offset = y % 2;
    var neighbors = [
      [offset - 1, -1], [offset, -1],
      [-1, 0], [1, 0],
      [offset - 1, 1], [offset, 1]
    ];
    neighbors = neighbors.map(([hx, hy]) => this.getHex(hx + x, hy + y, wrap));
    neighbors = neighbors.filter(n => n);
    return neighbors;
  }

  createHexes(w, h) {
    var svg = this.svg;
    var NS = this.svg.namespaceURI;
    svg.setAttribute("viewBox", `2 0 ${WIDTH * w + WIDTH / 2 + 4} ${HEIGHT * h}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    var hexes = this.hexes = [];
    for (var y = 0; y < h; y++) {
      if (!hexes[y]) hexes[y] = [];
      for (var x = 0; x < w; x++) {
        hexes[y][x] = {
          row: y,
          column: x,
          state: NORMAL,
          nextState: null,
          immuneCounter: null,
          vaccinated: false,
          shuffle: this.prng.random(),
          shuffle2: this.prng.random()
        }
      }
    }

    var flatHexes = this.flattened = hexes.flatMap(d => d);
    flatHexes.forEach(function(hex) {
      var element = document.createElementNS(NS, "path");
      var offset = (hex.row % 2) / 2 * WIDTH;
      var cx = HALF_HEX + hex.column * WIDTH + offset;
      var cy = HALF_HEX + hex.row * HEIGHT;
      var r = HALF_HEX - 1;
      var points = [];
      for (var i = 0; i < TAU; i += SLICE) {
        points.push([cx + Math.cos(i + SPIN) * r, cy + Math.sin(i + SPIN) * r]);
      }
      var d = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
      element.setAttribute("d", d);
      element.dataset.x = hex.column;
      element.dataset.y = hex.row;
      svg.appendChild(element);
      hex.element = element;
    });
  }

  assignStates() {
    var { flattened, hexes, config } = this;
    // reset all hexes
    flattened.forEach(function(hex) {
      hex.state = NORMAL;
    });
    flattened.sort((a, b) => a.shuffle - b.shuffle);
    // set our initial infections
    var seeds = flattened.slice(0, SEED_COUNT);
    seeds.forEach(s => s.state = INFECTED);
    // apply other params
    flattened.forEach(function(cell) {
      cell.vaccinated = false;
    });
    // exclude seeds and neighboring cells
    var seedNeighbors = new Set(seeds.flatMap(s => this.getNeighbors(s.column, s.row)));
    var vaxCopy = flattened.filter(f => f.state != INFECTED && !seedNeighbors.has(f));
    var vaxCount = config.vax / 100 * flattened.length
    var vaccinatedSlice = vaxCopy.slice(0, vaxCount);
    vaccinatedSlice.forEach(hex => hex.vaccinated = true);
    var immuneCopy = vaxCopy.slice().sort((a, b) => a.shuffle2 - b.shuffle2);
    var immuneCount = config.immunity / 100 * flattened.length;
    var immuneSlice = immuneCopy.slice(vaxCount, vaxCount + immuneCount);
    immuneSlice.forEach(hex => hex.state = IMMUNE);

    // update view
    this.renderHexes();
  }

  renderHexes() {
    this.flattened.forEach(function(h) {
      h.element.dataset.state = h.state;
      h.element.dataset.vaccinated = !!h.vaccinated;
    });
  }

  reset(seed) {
    if (seed) {
      this.prng.reseed(seed);
    }
    this.history = [];
    if (this.playing) clearTimeout(this.playing);
    this.playing = false;
    this.flattened.forEach(h => {
      h.shuffle = this.prng.random();
      h.shuffle2 = this.prng.random();
    });
    this.assignStates();
  }

  tick() {
    if (!this.playing) return;
    var { flattened, hexes, config } = this;
    flattened.forEach(hex => {
      // if (hex.state == RECOVERED) {
      //   hex.recoveredCounter--;
      //   if (hex.recoveredCounter == 0) {
      //     hex.state = NORMAL;
      //   }
      // }
      if (hex.state == INFECTED) {
        // update neighbors
        // do not wrap at the edges
        var neighbors = this.getNeighbors(hex.column, hex.row, false);
        var infectable = neighbors.filter(n => ![RECOVERED, INFECTED, IMMUNE].includes(n.state));
        infectable.forEach(n => {
          // assume immunity after recovery
          if (n.state == RECOVERED) return;
          // figure possible infection, doubled to make sure we get some results
          var roll = this.prng.random();
          var chance = (config.r / 100);
          // reduce if vaccination exists
          if (n.vaccinated) {
            chance *= (1 - config.efficacy / 100);
          }
          if (roll < chance) {
            n.nextState = INFECTED;
          }
        });
        // this cell recovers
        hex.nextState = RECOVERED;
        hex.recoveredCounter = config.immunity;
      }
    });
    // apply next state
    var updated = 0;
    flattened.forEach(function(hex) {
      var previous = hex.state;
      hex.state = hex.nextState || hex.state;
      hex.nextState = null;
      if (previous != hex.state) updated++;
    });
    this.renderHexes();

    if (updated) {      
      var detail = this.history;
      this.svg.dispatchEvent(new CustomEvent("tick", { detail }));

      this.takeSnapshot();
      this.playing = setTimeout(this.tick, 200);
    } else {
      this.playing = false;
      console.log(`simulation has stabilized after ${this.history.length} cycles`);
      // console.table(this.history);
      var detail = this.history;
      this.svg.dispatchEvent(new CustomEvent("tick", { detail }));
      this.svg.dispatchEvent(new CustomEvent("stabilized"));
    }
  }

  countHexes() {
    var counts = {
      [RECOVERED]: 0,
      [INFECTED]: 0,
      [NORMAL]: 0,
      [VACCINATED]: 0,
      [IMMUNE]: 0
    };
    var flattened = this.flattened;
    flattened.forEach(h => {
      counts[h.state]++;
      if (h.vaccinated) counts[VACCINATED]++;
    });
    return counts;
  }

  takeSnapshot() {
    var counts = this.countHexes();
    this.history.push(counts);
  }

  start() {
    this.takeSnapshot();
    this.playing = true;
    this.tick();
  }

}

module.exports = Simulation;