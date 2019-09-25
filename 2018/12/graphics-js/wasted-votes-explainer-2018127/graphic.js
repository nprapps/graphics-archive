console.clear()

// Global vars
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
var pymChild;

var { COLORS, makeTranslate, classify, formatStyle } = require("./lib/helpers");

var d3 = Object.assign({},
    require("d3-axis/dist/d3-axis.min"),
    require("d3-scale/dist/d3-scale.min"),
    require("d3-selection/dist/d3-selection.min")
);


// Initialize the graphic.
var onWindowLoaded = function() {
    window.addEventListener("resize", render);

    render();

    pym.then(child => {
        pymChild = child;
        child.sendHeight();

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            data = JSON.parse(data);
            ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });
    });
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {

    // Render the chart!
    var container = "#bar-chart";
    var element = document.querySelector(container);
    var width = element.offsetWidth;
    renderGraphic({
        container,
        width,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


// Render a bar chart.
var renderGraphic = function(config) {

    d3.select(config.container).html('');

    for (i = 0; i < 2; i++) {
        d3.select(config.container).append("div")
            .attr('class', 'explainer-container explainer-container-' + (i + 1));
    }

    function makeScenario(index, demVotePct, gopVotePct, demVotes, gopVotes) {
        // build first explainer chart

        var explChart = d3.select('.explainer-container-' + index)
            .append('div')
            .attr('class', "expl-chart-" + index);

        var explChartPhotos = explChart.append('div')
            .attr('class', 'photos-col')

        if (index == 2) {
            var demCand = "Linda Coleman";
            var gopCand = "George Holding";
        }

        if (index == 1) {
            var demCand = "G.K. Butterfield";
            var gopCand = "Roger Allison";
        }


        explChartPhotos.append("div")
            .attr('class', 'cand-photo')
            .html("<img alt='candidate photo' src='./" + demCand.split(" ")[1].toLowerCase() + ".jpg'>")
        explChartPhotos.append("div")
            .attr('class', 'cand-name')
            .html(demCand + " (D)<br><b>" + (demVotePct * 100) + "%</b>")



        explChartPhotos.append('div')
            .attr('class', "clear-both");

        explChartPhotos.append("div")
            .attr('class', 'cand-photo')
            .html("<img alt='candidate photo' src='./" + gopCand.split(" ")[1].toLowerCase() + ".jpg'>")

        explChartPhotos.append("div")
            .attr('class', 'cand-name')
            .html(gopCand + " (R)<br><b>" + (gopVotePct * 100) + "%</b>")



        var explChartBars = explChart.append('div')
            .attr('class', 'chart-bars');



        var photoColWidth = d3.select(".photos-col").node().getBoundingClientRect().width;




        var maxBarWidth = (config.width - photoColWidth - 25);


        var xScale = d3.scaleLinear()
                      .range([0, maxBarWidth])
                      .domain([0, 190000]);


        if (demVotePct > gopVotePct) {

            explChartBars.append('div')
                .attr('class', 'dem-chart-bar highlight-bar chart-bar')
                .attr("style", "width: " + xScale(gopVotes) + "px")
                .append("span")
                .attr("class", "in-bar-label")
                .html("Needed to win<br>" + (gopVotes + 1).toLocaleString() + " votes");

            explChartBars.append('div')
                .attr('class', 'dem-chart-bar chart-bar')
                .attr("style", "width: " + (xScale(demVotes) - xScale(gopVotes)) + "px")
                .append("span")
                .attr("class", "in-bar-label label-dark")
                .html('"Wasted"<br>' + (demVotes - gopVotes - 1).toLocaleString() + ' votes');

            explChartBars.append('div')
                .attr('class', 'filler-chart-bar chart-bar')
                .attr("style", "width: " + (maxBarWidth - xScale(demVotes) - 10) + "px");

            explChartBars.append('div')
                .attr('class', 'gop-chart-bar chart-bar')
                .attr("style", "width: " + (xScale(gopVotes)) + "px")
                .append('span')
                .attr("class", "in-bar-label label-dark")
                .html('"Wasted"<br>' + (gopVotes).toLocaleString() + ' votes');
        }

        if (demVotePct < gopVotePct) {


            explChartBars.append('div')
                .attr('class', 'dem-chart-bar chart-bar')
                .attr("style", "width: " + (xScale(demVotes)) + "px")
                .append("span")
                .attr("class", "in-bar-label label-dark")
                .html('"Wasted"<br>' + (demVotes).toLocaleString() + ' votes');

            explChartBars.append('div')
                .attr('class', 'filler-chart-bar chart-bar')
                .attr("style", "width: " + (maxBarWidth - xScale(demVotes) ) + "px");

            explChartBars.append('div')
                .attr('class', 'gop-chart-bar highlight-bar chart-bar')
                .attr("style", "width: " + xScale(demVotes + 1) + "px")
                .append("span")
                .attr("class", "in-bar-label")
                .html("Needed to win<br>" + (demVotes + 1).toLocaleString() + " votes");

            explChartBars.append('div')
                .attr('class', 'gop-chart-bar chart-bar')
                .attr("style", "width: " + (xScale(gopVotes) - xScale(demVotes)) + "px");
        }

        d3.select('.explainer-container-' + index)
            .append('div')
            .attr('class', "clear-both");


        var explainerTexts = ["Drawing district boundaries to fill one district with a huge majority for one party is known as 'packing' the district. <b>North Carolina 01</b> is an example of this. The district forced Democrats to \"waste\" a large number votes on a race that they would easily win. Those votes, in turn, are not able to be cast in more competitive races.",

            "In more competitive races, like this one in <b>North Carolina 02</b>, the party with control of a partisan gerrymander wants to have a <em>narrow</em> majority. Why? Instead of piling more votes into a district that they've alerady won, the party can instead spread out additional votes to other competitive districts."
        ]

        console.log(LABELS)

        d3.select('.explainer-container-' + index)
            .append('div')
            .attr('class', 'explainer-text')
            .html(LABELS['explainer_nc0' + [index]]);

    }

    makeScenario(1, .698, .302, 188074, 81486)
    makeScenario(2, .457, .514, 148959, 167382 )

    d3.select(config.container).append('div')
        .attr('class', 'clear-both');
}

// Initially load the graphic
window.onload = onWindowLoaded;


window.setInterval(function() {
     pymChild.sendHeight();

}, 1000)