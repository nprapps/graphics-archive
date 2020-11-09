var pym = require("./lib/pym");
require("./lib/webfonts");
var $ = require("./lib/qsa");

pym.then(child => {
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
});


const SENSITIVITY = .9;
var diseaseInput = $.one("#disease-rate");
var falseInput = $.one("#false-rate");

var computeFalse = function() {
  var diseaseRate = diseaseInput.value * .01;
  var failureRate = falseInput.value * .01;
  var numerator = SENSITIVITY * diseaseRate;
  var denominator = SENSITIVITY * diseaseRate + failureRate * (1 - diseaseRate);
  var rate = 1 - (numerator / denominator);
  result.innerHTML = Math.round(rate * 100) + "%";
};

// update inputs and outputs
var inputs = [diseaseInput, falseInput];
var result = $.one(".outputs .output");
var labels = new Map();
var updateLabel = function() {
  var label = labels.get(this);
  label.innerHTML = this.value;
  computeFalse();
}
inputs.forEach(function(input) {
  var id = input.id;
  var label = $.one(`label[for="${id}"] .output`);
  labels.set(input, label);
  label.innerHTML = input.value;
  input.addEventListener("input", updateLabel);
  input.addEventListener("change", updateLabel);
});


computeFalse();