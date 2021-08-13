/*
* Wrap a block of SVG text to a given width
* adapted from http://bl.ocks.org/mbostock/7555321
*/
module.exports = function(texts, width, lineHeight) {

  var eachText = function(text) {
    // work with arrays as well
    var words = text.textContent.split(/\s+/).reverse();

    var word = null;
    var line = [];
    var lineNumber = 0;

    var x = text.getAttribute("x") || 0;
    var y = text.getAttribute("y") || 0;

    var dx = parseFloat(text.getAttribute("dx")) || 0;
    var dy = parseFloat(text.getAttribute("dy")) || 0;

    text.textContent = "";

    var NS = "http://www.w3.org/2000/svg";
    var tspan = document.createElementNS(NS, "tspan");
    text.appendChild(tspan);

    var attrs = { x, y, dx: dx + "px", dy: dy + "px" };
    for (var k in attrs) {
      tspan.setAttribute(k, attrs[k]);
    }

    while (word = words.pop()) {
      line.push(word);
      tspan.textContent = line.join(" ");

      if (tspan.getComputedTextLength() > width) {
        line.pop();
        tspan.textContent = line.join(" ");
        line = [word];

        lineNumber += 1;

        tspan = document.createElementNS(NS, "tspan");
        text.appendChild(tspan);

        var attrs = { x, y, dx: dx + "px", dy: (lineNumber * lineHeight) + dy + "px" };
        for (var k in attrs) {
          tspan.setAttribute(k, attrs[k]);
        }
        tspan.textContent = word;
      }
    }
  };

  // convert D3 to array
  if ("each" in texts) {
    // call D3-style
    texts = texts.nodes();
  } 
  texts.forEach(eachText);
};
