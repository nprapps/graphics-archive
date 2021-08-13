require("./infection-zone");

var css = `
:host {
  display: block;
  padding: 2px;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
}

label {
  display: block;
  font-size:20px;
}

input {
  display: none;
  width: 100px;
  margin-left: 8px;
}

:host([controls]) input,
:host([controls]) label {
  display: block;
  visibility: visible;
}

infection-zone {
  display: block;
  min-height: 4px;
  margin: 2px;
}

.zone-container {
  margin-bottom: 20px;
}

@media (min-width: 400px) {
  .zone-container {
    display: flex;
  }

  infection-zone {
    flex: 1;
  }
}

`;

class RStages extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
    <style>${css}</style>
    <div class="controls">
      <label></label>
      <input type="range" min="1.3" max="2.2" step=".1">
    </div>
    <div class="zone-container"></div>
    `;

    var zoneContainer = this.shadowRoot.querySelector(".zone-container");
    this.zones = [];
    for (var i = 0; i < 6; i++) {
      var zone = document.createElement("infection-zone");
      zone.setAttribute("stages", "0");
      zone.id = `stage-${i}`;
      zone.setAttribute("title", `Generation ${i + 1}`)
      this.zones.push(zone);
      zoneContainer.appendChild(zone);
    }

    this.slider = this.shadowRoot.querySelector("input");
    this.onSliderInput = this.onSliderInput.bind(this);
    this.slider.addEventListener("input", this.onSliderInput);

    this.label = this.shadowRoot.querySelector("label");
  }

  static get observedAttributes() {
    return ["initial", "r"];
  }

  get initial() {
    return (this.getAttribute("initial") * 1) || 10;
  }

  attributeChangedCallback(attr, was, value) {
    switch (attr) {
      case "r":
        this.slider.value = value;
        this.label.innerHTML = `R-value: ${value}`;
        this.update();
        break;
    }
  }

  onSliderInput() {
    this.update();
  }

  update() {
    var r = this.slider.valueAsNumber;
    this.label.innerHTML = `Each infected person infects <b>${r}</b> people on average`;
    var values = [this.initial];
    this.zones[0].setAttribute("stages", values);
    for (var i = 1; i < this.zones.length; i++) {
      var previous = values[i - 1];
      values.push(Math.round(previous * r));
      this.zones[i].setAttribute("stages", values);
    }
  }
}

customElements.define("r-stages", RStages);