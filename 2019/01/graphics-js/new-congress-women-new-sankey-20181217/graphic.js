console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { COLORS, makeTranslate, classify } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

var d3 = Object.assign({},
    require("d3-axis"),
    require("d3-scale"),
    require("d3-sankey"),
    require("d3-selection")
);

var capitalize = function(s) {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

function render() {


    var graphicContainer = d3.select(".graphic"),
        oldContainer = d3.select(".old-members"),
        newContainer = d3.select(".new-members")


    graphicContainer.html('');

    function old_female_sort(a, b) {
        if (a["replacing_gender"] == "F") {
            return -1;
        } else {
            return 1;
        }
        return 0;
    }

    function new_female_sort(a, b) {
        if (a["new_gender"] == "F") {
            return -1;
        } else {
            return 1;
        }
        return 0;
    }


    DATA = DATA.filter(d => d["dist"] != "NC-09");


    var color = function(gender) {
        var color = d3.scaleOrdinal(d3.schemeCategory10);
        return gender => color(gender.replace(/ .*/, ""));
    }


    // ///////////////


    var data = {
            "nodes": [
                { "gender": "Female", "type": "departing", "party": "Dem." },
                { "gender": "Male", "type": "departing", "party": "Dem." },
                { "gender": "Female", "type": "departing", "party": "Repub." },
                { "gender": "Male", "type": "departing", "party": "Repub." },
                { "gender": "Female", "type": "new", "party": "Dem." },
                { "gender": "Male", "type": "new", "party": "Dem." },
                { "gender": "Female", "type": "new", "party": "Repub." },
                { "gender": "Male", "type": "new", "party": "Repub." },
            ],
            "links": [
            ]
        },
        width = window.innerWidth,
        height = 500;

    var newNodes = data.nodes.filter(d => d.type == "new")
    var departingNodes = data.nodes.filter(d => d.type == "departing")

    for (i = 0; i < departingNodes.length; i++) {
        for (k = departingNodes.length; k < data.nodes.length; k++) {
            data.links.push({ "source": i, "target": k, "value": DATA.filter(d => d["replacing_party"] == data.nodes[i]["party"].charAt(0) && d["new_party"] == data.nodes[k]["party"].charAt(0) && d["replacing_gender"] == data.nodes[i]["gender"].charAt(0) && d["new_gender"] == data.nodes[k]["gender"].charAt(0)).length })
        }
    }

    // console.log(data.links)

    var maxWidth = 800;
    if (width > maxWidth) {
        width = maxWidth;
    }

    var labelWrap = d3.select(".graphic").append("div")
        .attr("class", "col-label-wrappers")

    labelWrap.append("div")
        .html(LABELS.hdr_departing)
        .attr("class", "col-label col-label-left")

    labelWrap.append("div")
        .html(LABELS.hdr_new)
        .attr("class", "col-label col-label-right")

    labelWrap.append('div')
        .attr("class", "clearfix")



    var svg = d3.select(".graphic")
        .append('svg')
        .attr("width", width)
        .attr("height", height);

    var nodeWidth = 100;
    if (isMobile) {
        nodeWidth = 85;
    }


    var sankey = d3.sankey()
        .nodeWidth(100)
        .nodePadding(10)
        .extent([
            [0, 0],
            [width, height]
        ]);


    var { nodes, links } = sankey(data);


    svg.append("g")
        .selectAll("rect")
        .data(nodes)
        .enter().append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", "green")
        .attr('class', function(d) {
            return classify(d.gender) + "-rect " + classify(d.party) + "-rect " + classify(d.type) + "-rect " + "sankey-rect"
        })

    var link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.8)
        .selectAll("g")
        .data(links)
        .enter().append("g")
        .style("mix-blend-mode", "multiply")
        .style("display", function(d) {
            if (d.value == 0) {
                return "none"
            }
        });

    // if (edgeColor === "path") {
    var gradient = link.append("linearGradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d => d.source.x1)
        .attr("x2", d => d.target.x0);

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d => color(d.source.gender));

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d => color(d.target.gender));
    // }

    link.append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        // .attr("stroke", "black")
        .attr("class", function(d) {
            return classify(d.target.gender) + "-link " + classify(d.target.party) + "-link " + "sankey-link"
        })
        .attr("stroke-width", d => Math.max(1, d.width));

    // link.append("title")
    //     .text(d => `${d.source.gender} → ${d.target.gender}\n${format(d.value)}`);


    var textXwalk = {"Repub.": "GOP", "Dem.": "Dem.", "Male": "men", "Female": "women"}

    var topLabelPadding = 10,
    leftLabelPadding = 8;

    svg.append("g")
        .style("font", "10px sans-serif")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        // .attr("x", d => d.x0 < width / 2 ? d.x0 + 6 : d.x0 - 6)
        .attr("x", d => d.x0 + leftLabelPadding)
        // .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("y", function(d){
            if (d.gender == "Female" && d.party == "Repub." && d.type == "new") {
                return d.y0 - 4
            }
            return d.y0 + topLabelPadding
        })
        .attr("dy", "0.35em")
        .attr("class", d => "node-labels " + classify(d.gender) + "-label" + " " + classify(d.party) + "-label" + " " + classify(d.type) + "-label")
        // .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .attr("text-anchor", "start")
        .html(function(d) {
            // if (d.gender == "Female" && d.party == "Repub." && d.type == "new") {
            //     return ""
            // }
            return textXwalk[d.party] + " " + textXwalk[d.gender].toLowerCase();
        });

    svg.append("g")
        .style("font", "10px sans-serif")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        // .attr("x", d => d.x0 < width / 2 ? d.x0 + 6 : d.x0 - 6)
        .attr("x", d => d.x0 + leftLabelPadding)
        // .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("y", d => d.y0 + topLabelPadding + 24)
        .attr("class", d => "node-labels node-labels-vals " + classify(d.gender) + "-label" + " " + classify(d.party) + "-label" + " " + classify(d.type) + "-label")
        // .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .attr("text-anchor", "start")
        .html(function(d) {
            if (d.gender == "Female" && d.party == "Repub." && d.type == "new") {
                return ""
            }
            return d.value;
        });


}

render()




window.onresize = render;
