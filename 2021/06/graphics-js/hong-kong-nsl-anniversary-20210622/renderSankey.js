var { isMobile } = require("./lib/breakpoints");

var { COLORS, makeTranslate, classify, formatStyle } = require("./lib/helpers");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-sankey/dist/d3-sankey.min"),
};

// Render a Sankey diagram
var renderSankeyDiagram = function (config) {
  // Setup
  var margins = {
    top: 0,
    right: 0,
    bottom: 20,
    left: 0,
  };

  var paddings = {
    top: 30,
    right: 1,
    bottom: 5,
    left: 1,
  };

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = 450;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Create the root SVG element
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 Sankey object
  var Sankey = d3
    .sankey()
    .nodeId(d => d.id)
    .nodeAlign(d3.sankeyJustify)
    .nodeWidth(isMobile.matches === true ? 20 : 40)
    .nodePadding(10)
    .extent([
      [paddings.left, paddings.top],
      [chartWidth - paddings.right, chartHeight - paddings.bottom],
    ]);

  var sankey = function ({ nodes, links }) {
    return Sankey({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: links.map(d => Object.assign({}, d)),
    });
  };

  // Create color class function
  var { red3, orange3, yellow2, teal3, blue3 } = COLORS;

  var color = function (d) {
    switch (d.category) {
      case "No or pending charge":
        return "#999";
      case "Unspecified offense":
        return blue3;
      case "Secession":
        return orange3;
      case "Subversion":
        return teal3;
      case "Collusion":
        return red3;
      case "Terrorism":
        return yellow2;
      default:
        // Black = unmatched category
        return "#000";
    }
  };

  // Create data for chart
  var { nodes, links } = sankey(config.data);

  // Draw rects
  var node = chartElement
    .append("g")
    //.attr("stroke", "#777")
    .selectAll("rect")
    .data(nodes)
    .join("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", color);

  var name = function (d) {
    return `${d.type} (${d.category})`;
  };

  node.append("title").text(d => `${name(d)}\n${d.value}`);

  // Create links
  var link = chartElement
    .append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.3)
    .selectAll("g")
    .data(links)
    .join("g")
    .style("mix-blend-mode", "multiply");

  // Link color gradients
  var gradient = link
    .append("linearGradient")
    .attr("id", d => `nsl-${d.source.id}-${d.target.id}`)
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", d => d.source.x1)
    .attr("x2", d => d.target.x0);

  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", d => color(d.source));

  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", d => color(d.target));

  // Draw links
  link
    .append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => `url(#nsl-${d.source.id}-${d.target.id})`)
    .attr("stroke-width", d => Math.max(1, d.width));

  link.append("title").text(d => `${name(d.source)} → ${name(d.target)}`);

  // Create type labels
  chartElement
    .append("g")
    .selectAll("text")
    .data(config.data.columns)
    .join("text")
    .attr("class", "sankey-type")
    .attr("x", d => (d.includes("Arrest") ? 0 : chartWidth))
    .attr("y", paddings.top - 12)
    .attr("text-anchor", d => (d.includes("Arrest") ? "start" : "end"))
    .text(d => d);

  // Create category labels
  chartElement
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("x", d => (d.x0 < chartWidth / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr(
      "class",
      d =>
        `sankey-category sankey-category-${d.y1 - d.y0 > 60 ? "big" : "small"}`
    )
    .attr("text-anchor", d => (d.x0 < chartWidth / 2 ? "start" : "end"))
    .text(d => `${d.category}: ${d.value}`);
};

module.exports = renderSankeyDiagram;
