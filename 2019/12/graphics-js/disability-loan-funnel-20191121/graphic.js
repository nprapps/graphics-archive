console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { fmtComma } = require("./lib/helpers");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var pymChild = null;
pym.then(function(child) {
  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", render);

  child.onMessage("on-screen", function(bucket) {
    ANALYTICS.trackEvent("on-screen", bucket);
  });
  child.onMessage("scroll-depth", function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });
});

var render = function() {


  //put your D3 code here

  var unitRepresents = 1000;
  if (isMobile.matches) {
    unitRepresents = 5000
    LABELS["Annotation_1"] = LABELS["Annotation_1"].replace("sents 1,000", "sents " + fmtComma(unitRepresents));
  }
  else {
    LABELS["Annotation_1"] = LABELS["Annotation_1"].replace("sents 5,000", "sents " + fmtComma(unitRepresents));
  }



  var totalIcons = DATA[0].highlight / unitRepresents;

  var stepWrapperMargins = 63;
  d3.selectAll(".step-wrapper").attr(
    "style",
    "margin-bottom: " + stepWrapperMargins + "px"
  );

  d3.select(".step-3-wrapper").attr("style", "");

  var width = d3
    .select(".step-wrapper")
    .node()
    .getBoundingClientRect().width;

  // this is from inspector
  var origIconwidth = 264;
  var origIconheight = 247;

  var scaleIcon = 0.075;
  var iconWidth = origIconwidth * scaleIcon;
  var iconHeight = origIconheight * scaleIcon;

  var perRow = Math.floor(width / (iconWidth + 2));

  // var rowPadding = 4;
  // var rowHeight = iconHeight + rowPadding;

  var xScale = d3
    .scaleLinear()
    .domain([0, perRow])
    .range([0, width]);

  for (i in DATA) {
    var thisRow = DATA[i];

    d3.select(".step-" + thisRow.step + "-wrapper").html("");

    var stepDiv = d3
      .select(".step-" + thisRow.step + "-wrapper")
      .append("div")
      .attr("width", width);

    var rowCounter = 0;
    var currentRow = -1;

    for (k = 0; k < totalIcons; k++) {
      if (rowCounter % perRow == 0) {
        rowCounter = 0;
        currentRow = currentRow + 1;
      }

      stepDiv
        .append("img")
        .attr("class", function(){
          var classReturn = "icon ";

          var startProvisional =
            (DATA[0].highlight - DATA[1].highlight) / unitRepresents;

          if (i != 0 && k >= startProvisional) {
            filePrefix = "blu-";
          } else {
            filePrefix = "lt-red-";
          }

          if (
            i == 2 &&
            k >= startProvisional &&
            k <
              startProvisional +
                (DATA[1].highlight - DATA[2].highlight) / unitRepresents
          ) {
            filePrefix = "dk-red-";
          }

          classReturn = classReturn + filePrefix.split("-").join("")

          return classReturn


        })
        .attr("width", iconWidth)
        .attr("src", function() {
          var filePrefix = "";

          // three colors

          var startProvisional =
            (DATA[0].highlight - DATA[1].highlight) / unitRepresents;

          if (i != 0 && k >= startProvisional) {
            filePrefix = "blu-";
          } else {
            filePrefix = "lt-red-";
          }

          if (
            i == 2 &&
            k >= startProvisional &&
            k <
              startProvisional +
                (DATA[1].highlight - DATA[2].highlight) / unitRepresents
          ) {
            filePrefix = "dk-red-";
          }

          if (k % 4 == 0) {
            return "imgs/" + filePrefix + "icon-4.png";
          }
          if (k % 3 == 0) {
            return "imgs/" + filePrefix + "icon-3.png";
          }
          if (k % 2 == 0) {
            return "imgs/" + filePrefix + "icon-1.png";
          }
          return "imgs/" + filePrefix + "icon-2.png";
        });

      rowCounter = rowCounter + 1;
    }
  }

  // add in annotations

  var pgWidth = d3
    .select("body")
    .node()
    .getBoundingClientRect().width;

  var graphicHeight = d3
    .select(".step-1-wrapper")
    .node()
    .getBoundingClientRect().height;

  var minTextWidth = 155;
  var bothSidesTextPadding = 30;
  var minTextRoom = minTextWidth + bothSidesTextPadding * 2;

  var roomForText = (pgWidth - width) / 2;
  var maxTextWidth = 250;

  var textWidth = roomForText - bothSidesTextPadding * 2;

  if (textWidth > maxTextWidth) {
    textWidth = maxTextWidth;
  }

  var insertAnnotWrapper = function(index, widescreen) {
    var thisWrapper;

    if (widescreen) {
      thisWrapper = d3.select(".graphic").append("div");
    } else {
      textWidth = "100%";
      maxTextWidth = "650px;";
      thisWrapper = d3
        .select(".graphic")
        .insert("div", ".step-" + (parseInt(index)+1) + "-wrapper");
    }

    thisWrapper
      .attr("class", "annot-wrapper annot-wrapper-" + index)
      .classed("mobile-wrapper", !widescreen)
      .attr("style", function() {
        if (i % 2 == 0) {
          return (
            "right: " +
            (roomForText - bothSidesTextPadding - textWidth) +
            "px; width: " +
            textWidth +
            "px; top: " +
            topPlacement +
            "px; max-width: " +
            maxTextWidth +
            "px"
          );
        } else {
          return (
            "left: " +
            (roomForText - bothSidesTextPadding - textWidth) +
            "px; width: " +
            textWidth +
            "px; top: " +
            topPlacement +
            "px; max-width: " +
            maxTextWidth +
            "px"
          );
        }
      })
      .html(LABELS["Annotation_" + (parseFloat(index) + 1)]);
  };

  for (i in DATA) {
    d3.select(".annot-wrapper.annot-wrapper-" + i).remove();

    // place at top of graphic chunks
    var topPlacement = graphicHeight * i + stepWrapperMargins * i;

    // place at top of graphic chunks
    // var highlightRow = Math.floor(((DATA[0].highlight - DATA[i].highlight)/unitRepresents)/perRow)
    // var topPlacement = (graphicHeight*i) + (stepWrapperMargins*i) + (highlightRow*(iconHeight + 2))

    if (roomForText >= minTextRoom) {
      insertAnnotWrapper(i, true);
    } else {
      insertAnnotWrapper(i, false);
    }
  }

  pymChild.sendHeight();
};

setTimeout(function() {
  render();
}, 3000);

//first render
// render();
