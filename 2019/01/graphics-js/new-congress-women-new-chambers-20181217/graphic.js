console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { COLORS, makeTranslate, classify } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");



function sendPym() {
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
}

var d3 = Object.assign({},
    require("d3-axis"),
    require("d3-scale"),
    require("d3-selection")
);


var graphicContainer = d3.select(".graphic");

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

var animateLoop;

function render() {



    graphicContainer.html("")

    var contentChamberHTML = d3.select('.content-chamber-container').html()


    var dots = d3.selectAll("svg .cls-1")


    var dataJson = [{ "gopWomen": 11, "demWomen": 14, "congress": 101 }, { "gopWomen": 9, "demWomen": 19, "congress": 102 }, { "gopWomen": 12, "demWomen": 35, "congress": 103 }, { "gopWomen": 17, "demWomen": 30, "congress": 104 }, { "gopWomen": 16, "demWomen": 35, "congress": 105 }, { "gopWomen": 17, "demWomen": 39, "congress": 106 }, { "gopWomen": 18, "demWomen": 41, "congress": 107 }, { "gopWomen": 21, "demWomen": 38, "congress": 108 }, { "gopWomen": 23, "demWomen": 42, "congress": 109 }, { "gopWomen": 21, "demWomen": 50, "congress": 110 }, { "gopWomen": 17, "demWomen": 58, "congress": 111 }, { "gopWomen": 24, "demWomen": 47, "congress": 112 }, { "gopWomen": 20, "demWomen": 59, "congress": 113 }, { "gopWomen": 22, "demWomen": 62, "congress": 114 }, { "gopWomen": 21, "demWomen": 62, "congress": 115 }, { "gopWomen": 13, "demWomen": 89, "congress": 116 }]



    function makeChamber(obj, firstChart) {

        var thisContainer = graphicContainer.append("div")
            .attr("class", function() {
                var addtlClass = "small-container"
                if (firstChart) {
                    addtlClass = "firstCotainer"
                }
                return "chamber-" + obj.congress + "-container chamber-container " + addtlClass
            })
            .html(contentChamberHTML)

        var svg = thisContainer.select("svg")
            .attr("class", function() {
                if (firstChart) {
                    return "big-chamber"
                } else {
                    return 'reg-chamber'
                }
            })


        for (i = 0; i < obj["gopWomen"]; i++) {
            thisContainer.select("svg #dot-" + i).classed("gopWoman", true);
        }

        for (i = obj["gopWomen"]; i < obj["demWomen"] + obj["gopWomen"]; i++) {
            thisContainer.select("svg #dot-" + i).classed("demWoman", true);
        }


        var svgWidth = svg.node().getBBox().width

        thisContainer.append("div")
            .html(function() {
                if (firstChart == false) {

                    return "<strong>" + (obj.congress * 2 + 1787) + "</strong><br>" + (obj.gopWomen + obj.demWomen)
                } else {
                    return "<strong>" + (obj.congress * 2 + 1787) + "</strong><br>" + (obj.gopWomen + obj.demWomen) + " women"
                }
            })
            .attr("class", "under-chamber-text")
            .classed("under-big-chamber-text", firstChart);


    }

    makeChamber(dataJson[dataJson.length - 1], true)




    dataJson.forEach(function(el, ind) {
        makeChamber(el, false)
    })




    if (window.innerWidth < 500) {
        isMobile = true
    } else {
        isMobile = false
    }





    if (isMobile) {

        var minShowCongress = 101

        var showCongress = minShowCongress

        showMobileChamber()


        function showMobileChamber() {
            d3.selectAll(".small-container")
                .attr("style", "display: none;")


            d3.select(".chamber-" + showCongress + "-container.small-container")
                .attr("style", "display: block;")

            showCongress = showCongress + 1
            if (showCongress > 116) {
                showCongress = minShowCongress
            }


            sendPym()
        }



        clearInterval(animateLoop)

        animateLoop = window.setInterval(function() {

            if (isMobile) {
                showMobileChamber()
            }



        }, 1500)

    } else {
        clearInterval(animateLoop)

    }

    sendPym()

}








window.onload = function() {
    render();
    sendPym();
}
window.onresize = render


// for (i = 0; i < data116["gopWomen"]; i++) {
//     graphicContainer.select("svg #dot-" + i).classed("gopWoman", true);
// }

// for (i = data116["gopWomen"]; i < data116["demWomen"] + data116["gopWomen"]; i++) {
//     graphicContainer.select("svg #dot-" + i).classed("demWoman", true);
// }