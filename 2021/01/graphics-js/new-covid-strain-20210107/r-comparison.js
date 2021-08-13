require("./infection-zone");

var css = `
:host {
  margin: 16px 0;
}

.all-zones {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: auto 1fr 1fr;
  grid-gap: 4px;
}

@media (max-width: 500px) {
  .all-zones {
    grid-auto-flow: row;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto;
  }

  h4 {
    padding-top: 8px;
    grid-column-start: 1;
    grid-column-end: 3;
  }
}

h4 {
  margin: 0 0 -5px 0;
  text-align: center;
  align-self: end;

  text-transform: uppercase;
  font: 12px/1.3 'Gotham SSm',Helvetica,Arial,sans-serif;
  font-size: 12px;
  color: #AA6A21;
}
h4:first-child {
  font-weight: bold;
  font-style: italic;
  text-transform: none;
  margin-bottom: -20px;
  color: #333;
}
@media (max-width: 500px) {
  h4:first-child {
    margin-bottom: 15px;
    font-size: 15px;
  }
}

.control {
  margin: 8px 0 15px 0;
  text-align: center;
  font-size: 16px;
  font-family: 'Gotham SSm',Helvetica,Arial,sans-serif;
}

[as="r1"], [as="r2"], [as="rSelected"] {
  font-weight: bold;
}

[as="rSelected"] {
  color: #AA6A21;
}

.zone {
  text-align: center;
  display: flex;
  justify-content: center;
  flex-direction: column;
  font: normal italic 12px/1.3 'Gotham SSm',Helvetica,Arial,sans-serif;
  color: #787878;
}

.zone > span {
  font-size: 14px;
  font-style: normal;
  color: #AA6A21;
  padding-bottom: 3px;
  align-self: center;
}

.zone [as="r2"] {
  border-bottom: 2px solid #AA6A21;
}

@media (max-width: 500px) {
  .zone {
    margin-bottom: 11px;
    background-color: #eee;
    padding: 10px 0;
  }
}


`;

var m = function(tagName, contents, attrs) {
  var e = document.createElement(tagName);
  if (contents) e.innerHTML = contents;
  return e;
}

class RComparison extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });
    var root = this.shadowRoot;
    root.innerHTML = `
      <style>${css}</style>
      <div class="control">
      <label for="r-value">R<sub>0</sub> value: <span as="rSelected"></span></label>
      <input id="r-value" as=slider type="range" min="1.3" max="2.2" step=".1"></input>
      </div>
      <div class="all-zones">
        <h4>
          ${window.LABELS.spread}
        </h4>
        <div class="zone">
            <span><span as="r2"></span> people</span>
            ${window.LABELS.sim}
        </div>
        <div class="zone">
          <span><span as="r1"></span> people</span>
          ${window.LABELS.variant}
        </div>
      </div>
    `;

    this.elements = {};
    root.querySelectorAll("[as]").forEach(el => this.elements[el.getAttribute("as")] = el);

    var zoneGroups = root.querySelector(".all-zones");
    this.groups = [];
    for (var i = 0; i < 5; i++) {
      zoneGroups.appendChild(m("h4", `Week ${i + 1}`));
      var a = m("infection-zone");
      var b = m("infection-zone");
      zoneGroups.appendChild(b);
      zoneGroups.appendChild(a);
      this.groups.push([a, b]);
    }

    this.onSliderInput = this.onSliderInput.bind(this);
    this.elements.slider.addEventListener("input", this.onSliderInput);
  }

  static get observedAttributes() {
    return [
      "initial",
      "r1",
      "r2"
    ];
  }

  attributeChangedCallback(attr, was, value) {
    if (was == value) return;
    switch (attr) {
      case "r2":
        this.elements.rSelected.innerHTML = value;
        this.elements.slider.value = value;

      default:
        this.update();
    }
  }

  onSliderInput() {
    var value = this.elements.slider.valueAsNumber;
    this.elements.r2.innerHTML = value;
    this.elements.rSelected.innerHTML = value;
    this.update();
  }

  update() {
    var r1 = this.getAttribute("r1") * 1;
    var r2 = this.elements.slider.value;
    this.elements.r1.innerHTML = r1;
    this.elements.r2.innerHTML = r2;
    var initial = this.getAttribute("initial") * 1;

    var [b, a] = this.groups[0];
    a.setAttribute("stages", initial);
    b.setAttribute("stages", initial);
    var g1 = [initial];
    var g2 = [initial];
    for (var i = 1; i < this.groups.length; i++) {
      var [a, b] = this.groups[i];
      var p1 = g1[g1.length - 1];
      var p2 = g2[g2.length - 1];
      g1.push(Math.round(p1 * r1));
      g2.push(Math.round(p2 * r2));
      a.setAttribute("stages", g1);
      b.setAttribute("stages", g2);
    }
  }


}

customElements.define("r-comparison", RComparison);
