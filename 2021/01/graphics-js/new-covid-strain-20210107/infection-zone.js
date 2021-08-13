var d3force = require("d3-force/dist/d3-force.min");
var COLORS = require("./lib/helpers/colors");

var { sqrt, PI, cos, sin } = Math;
var TAU = Math.PI * 2;

const ASPECT = 1;
const STAGES = [COLORS.teal3, COLORS.yellow3, COLORS.orange3, COLORS.red3];
const Y_FORCE = .05;
const X_FORCE = .05;
const COLLIDE_FORCE = .6;
const DOT_RADIUS = 2;
const REHEAT = .2;

const NEW_INFECTION = COLORS.orange2;
const EXISTING_CASE = COLORS.orange5;

var css = `
:host {
  padding: 8px 0;
}

h4 {
  font-family: 'Gotham SSm',Helvetica,Arial,sans-serif;
  font-weight: normal;
  font-weight: 700;
  font-size: 13px !important;
  text-align: center;
  margin-top: 0;
  margin-bottom:0;
}

h5 {
  font-family: 'Gotham SSm',Helvetica,Arial,sans-serif;
  font-weight: normal;
  font-weight: 400;
  font-size: 13px;
  text-align: center;
  line-height:14px;
  margin-bottom:6px;
  margin-top:0px;
}

.new-infection {
  background: ${NEW_INFECTION};
  color: white;
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 100%;
}

canvas {
  display: block;
  width: 100%;
  background: linear-gradient(to bottom, #F8F8F8, white, #EEE);
}
`;

class InfectionZone extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });
    this.stages = [];
    var root = this.shadowRoot;

    this.shadowRoot.innerHTML = `
    <style>${css}</style>
    <h4></h4>
    <h5>
      <div>Total: <b class="total"></b></div>
    </h5>
    <canvas></canvas>
    `;

    this.titleElement = root.querySelector("h4");
    this.countTotal = root.querySelector(".total");
    this.countNew = root.querySelector(".new");

    this.canvas = this.shadowRoot.querySelector("canvas");
    this.shadowRoot.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d");

    var simulation = this.simulation = d3force.forceSimulation();
    simulation.alphaDecay(0.01);
    simulation.stop(); // only run when visible

    var xForce = d3force.forceX().strength(X_FORCE);
    var yForce = d3force.forceY().strength(Y_FORCE);
    var collider = d3force.forceCollide().strength(COLLIDE_FORCE);
    collider.radius(DOT_RADIUS + 1.5);

    simulation.force("x", xForce);
    simulation.force("y", yForce);
    simulation.force("collide", collider);

    this.tick = this.tick.bind(this);
    this.onIntersection = this.onIntersection.bind(this);
    this.observer = new IntersectionObserver(this.onIntersection);
  }

  static get observedAttributes() {
    return ["stages", "title"];
  }

  connectedCallback() {
    this.render();
    this.observer.observe(this);
  }

  attributeChangedCallback(attr, was, value) {
    if (was == value) return;
    switch (attr) {
      case "stages":
        var stages = value.split(",").map(Number);
        this.updateStages(stages);
        this.countTotal.innerHTML = stages.reduce((a, b) => a + b, 0);
        // this.countNew.innerHTML = stages[stages.length - 1];
        this.render();
        break;

      case "title":
        this.titleElement.innerHTML = value;
        break;

      default:
        console.log(`Unhandled attribute change for ${attr}: ${was} -> ${value}`);
    }
  }

  get running() {
    return this._running || true;
  }

  set running(value) {
    if (value && !this._running) {
      requestAnimationFrame(this.tick);
    }
    this._running = value;
  }

  updateStages(stages) {
    stages.forEach((count, index) => {
      var dots = this.stages[index] || [];
      if (dots.length == count) return;
      // chop down
      dots = dots.slice(0, count);
      // add more if necessary
      if (dots.length < count) {
        var adding = count - dots.length;
        // console.log(`Adding ${adding} nodes to Stage ${index}`);
        var distances = dots.map(d => sqrt(d.x * d.x + d.y * d.y));
        var outer = Math.max(...distances);
        if (outer < 0) outer = 0;
        for (var i = 0; i < adding; i++) {
          var theta = Math.random() * TAU;
          var legacy = index < stages.length - 1;
          var distance = legacy ? 5 : outer || (index + 1) * 5;
          dots.push({
            stage: index,
            fill: legacy ? EXISTING_CASE : NEW_INFECTION,
            // fill: STAGES[index],
            x: cos(theta) * distance,
            y: sin(theta) * distance
          });
        }
      }
      this.stages[index] = dots;
    });
    this.simulation.alpha(REHEAT);
  }

  render() {
    var { canvas, context, dots } = this;
    canvas.width = this.offsetWidth;
    canvas.height = canvas.width * ASPECT;
    var centerX = canvas.width * .5;
    var centerY = canvas.height * .5;
    for (var dots of this.stages) {
      dots.forEach(function(dot) {
        var { x, y, fill } = dot;
        var cx = x + centerX;
        var cy = y + centerY;
        context.beginPath();
        context.arc(cx, cy, DOT_RADIUS, 0, TAU);
        context.fillStyle = fill;
        context.fill();
      });
    }
  }

  tick() {
    // run simulation
    var nodes = this.stages.flat();
    this.simulation.nodes(nodes);
    this.simulation.tick();
    this.render();
    if (this.running) requestAnimationFrame(this.tick);
  }

  onIntersection([e]) {
    this.running = e.isIntersecting;
  }
}

customElements.define("infection-zone", InfectionZone);
