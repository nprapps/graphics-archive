var pym = require("./lib/pym");
require("./lib/webfonts");
var $ = require("./lib/qsa");

// Global vars
var pymChild = null;
var renderStackedBarChart = require("./renderBars");
var skipLabels = ["name", "values", 'usps','clinton', 'trump', 'margin', 'difference', 'total_mail', 'total_rejected', 'total_cast', 'total_non_mail', 'In-Person', 'Mail-in', 'Rejected Mail-in', 'late_rejected', 'rejected_value', 'Primary'];

console.clear(); 

// Initialize the graphic.
var onWindowLoaded = function() {
  render();

  var input = $.one("#disease-rate");

  input.addEventListener("change", () => render(true))

  window.addEventListener("resize", () => render(true));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function(input, mailInPercent, update) {
  input = input.filter(d => d.name == "New Hampshire" || d.name == "Virginia");
  var data = input.map(function(d) {
    var x0 = 0;

    var label = d.name;
    var marker = d.margin;
    var values = [];

    for (var name in d) {
      if (skipLabels.indexOf(name) > -1) {
        continue;
      }

      var original = d[name];
      if (update) {
        mailInPercent = parseInt(mailInPercent);
        if (name == "In-Person") {
          original = 100 - mailInPercent;
        } else if (name == "Mail-in") {
          var rejected = d["Rejected Mail-in"] * 100
          original = mailInPercent - (mailInPercent * (rejected/(original + rejected)))
        } else if (name == "value") {
          original = mailInPercent * original
        }
      }


      var x1 = x0 + original;
      var val = original;

      // console.log(d["Mail-in"])
      // console.log(mailInPercent, name, original)

      values.push({
        name,
        x0,
        x1,
        val
      });

      x0 = x1;
    }
    console.log({ label, marker, values })
    return { label, marker, values };

  });

  return data;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(update) {
  // Render the chart!
  var data = formatData(window.DATA, $.one("#disease-rate").value, update);

  if (update) {
    $.one("#output").innerHTML = $.one("#disease-rate").value;
  }
  

  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderStackedBarChart({
    container,
    width,
    data,
    labelColumn: "label",
    nameColumn: "name",
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;