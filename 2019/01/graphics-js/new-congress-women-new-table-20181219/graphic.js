console.clear()

var pym = require("./lib/pym");
require("./lib/pym");
require("./lib/analytics");
require("./lib/webfonts");

var d3 = Object.assign({},
    require("d3-axis"),
    require("d3-scale"),
    require("d3-selection")
);


var pymChild;

var onWindowLoaded = function() {

    pym.then(child => {
        pymChild = child;
        pymChild.sendHeight();

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            data = JSON.parse(data);
            ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });

    });

}


// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))


var showStatus = 'hidden';
var firstRows = [];
var lastRows = [];
var allRows = d3.selectAll("tbody tr")._groups[0];

allRows.forEach(function(el, ind) {
    if (ind < 7) {
        firstRows.push(el)
    } else {
        lastRows.push(el)
    }
})

d3.selectAll(lastRows).classed("hidden", true)


d3.select(".show-hide")
    .on('click', function() {




        console.log(d3.select('.show-hide').html())

        if (showStatus == "hidden") {
            d3.select('.show-hide').html("&uarr; Show less")
            lastRows.forEach(function(el, ind) {
                d3.select(el).classed("show-row", true)
            })
            showStatus = "shown"
        } else {


            // clear any earlier back to tops

            d3.selectAll(".back-top-row").remove()


            d3.select('.show-hide').html("&darr; Show more")
            lastRows.forEach(function(el, ind) {
                d3.select(el).classed("show-row", false)
            })
            showStatus = "hidden"
        }

        pymChild.sendHeight();

    })






window.addEventListener("message", function(e) {
    if (e.data.boomerang) {
        // get the boomerang parameter
        // but for demo purposes

        // clear any earlier back to tops

        d3.selectAll(".back-top-row").remove()
        d3.selectAll(".highlight-row").classed('highlight-row', false)


        // show full table

        d3.select('.show-hide').html("&uarr; Show less")
        lastRows.forEach(function(el, ind) {
            d3.select(el).classed("show-row", true)
        })
        showStatus = "shown"

        // add a back to top row


        d3.select('#state-table tbody')
            .insert('tr', '.' + e.data.boomerang + " + *")
            .attr("class", "back-top-row hidden show-row")
            .append("td")
            .attr("colspan", "3")
            .attr("class", 'back-top-row')
            .append("a")
            .html("&uarr; Back to top")
            .on('click', function() {
                pymChild.scrollParentTo("responsive-embed-new-congress-women-new-photos-20181217");
            })






        // send new height
        pymChild.sendHeight();

        // jump to the correct row

        window.setTimeout(function() {

            var target = document.querySelector("." + e.data.boomerang);
            target.scrollIntoView();
            // color the row
            d3.select("." + e.data.boomerang)
                .attr("class", "highlight-row")
        }, 100)





    }
})


window.onload = onWindowLoaded;