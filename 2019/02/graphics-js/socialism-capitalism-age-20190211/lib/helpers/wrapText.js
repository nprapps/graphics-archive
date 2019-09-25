/*
* Wrap a block of SVG text to a given width
* adapted from http://bl.ocks.org/mbostock/7555321
*/
module.exports = function(texts, width, lineHeight) {
  var d3 = require("d3-selection/dist/d3-selection.min");

  texts.each(function() {
    var text = d3.select(this);
    var words = text.text().split(/\s+/).reverse();

    var word = null;
    var line = [];
    var lineNumber = 0;

    var x = text.attr("x");
    var y = text.attr("y");

    var dx = text.attr("dx") ? parseFloat(text.attr("dx")) : 0;
    var dy = text.attr("dy") ? parseFloat(text.attr("dy")) : 0;

    var tspan = text.text(null)
      .append("tspan")
      .attr("x", x)
      .attr("y", y)
      .attr("dx", dx + "px")
      .attr("dy", dy + "px");

    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));

      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];

        lineNumber += 1;

        tspan = text.append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dx", dx + "px")
          .attr("dy", (lineNumber * lineHeight) + dy + "px")
          // .attr("text-anchor", "begin")
          .text(word);
      }
    }
  });
};
