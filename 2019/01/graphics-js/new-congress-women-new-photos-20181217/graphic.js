console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { COLORS, makeTranslate, classify } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

var d3 = Object.assign({},
    require("d3-axis"),
    require("d3-scale"),
    require("d3-selection")
);


var graphicContainer = d3.select(".graphic"),
    oldContainer = d3.select(".old-members"),
    newContainer = d3.select(".new-members")

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


    render();
}


function render() {

    oldContainer.html("")
    newContainer.html("")
    d3.select(".show-hide").html("")

    var oldMenDists = DATA.filter(d => d["replacing_gender"] == "M" && d["newbie"] != "Dan McCready");
    var oldWomenDists = DATA.filter(d => d["replacing_gender"] == "F");

    var newMenDists = DATA.filter(d => d["new_gender"] == "M" && d["dist"] != "NC-09");
    var newWomenDists = DATA.filter(d => d["new_gender"] == "F" && d["dist"] != "NC-09");




    // add in labels

    oldContainer.append("h2")
        .html(LABELS.hdr_departing);

    newContainer.append("h2")
        .html(LABELS.hdr_new)


    DATA.sort(old_female_sort);

    DATA.filter(d => d.newbie != "Dan McCready").forEach(function(el, ind) {


        oldContainer
            .append('a')
            .attr("class", "img-a")
            .on('click', function() {
                window.parent.postMessage({
                    boomerang: el.dist
                }, "*");
            })
            .append("img")
            .attr("src", function() {
                if (el["replacing_gender"] == "M") {
                    return "old_photos/bw/" + el.replacing_photo + "bw.jpg"
                } else {
                    return "old_photos/" + el.replacing_photo+ ".jpg"

                }

            })
            .attr("alt", el.replacing)
            .attr("title", el.replacing)
            .attr("class", classify(el.replacing) + "-photo old-photo member-photo")
            .classed('female-photo', function() {
                if (el["replacing_gender"] == "F") {
                    return true;
                } else {
                    return false;
                }
            });

    })


    // ADD COUNT OF MEN AND WOMEN AFTER LAST PHOTO
    oldContainer.append('div')
        .attr("class", 'count-container')

        .html("<b>" + oldWomenDists.length + "</b> departing women<br><b>" + oldMenDists.length + "</b> departing men")



    DATA.sort(new_female_sort);

    DATA.forEach(function(el, ind) {


        if (el.dist != "NC-09") {
            newContainer
                .append('a')
                .attr("class", "img-a")
                .on('click', function() {
                    window.parent.postMessage({
                        boomerang: el.dist
                    }, "*");
                })
                .append("img")
                .attr("src", function() {
                    if (el["new_gender"] == "M") {
                        return "new_photos/bw/" + el.new_photo + "bw.jpg"
                    } else {
                        return "new_photos/" + el.new_photo + ".jpg"

                    }

                })
                .attr("alt", el.newbie)
                .attr("title", el.newbie)
                .attr("class", classify(el.newbie) + "-photo old-photo member-photo")
                .classed('female-photo', function() {
                    if (el["new_gender"] == "F") {
                        return true;
                    } else {
                        return false;
                    }
                });
        }


    })

    // ADD COUNT OF MEN AND WOMEN AFTER LAST PHOTO
    newContainer.append('div')
        .attr("class", 'count-container')

        .html("<b>" + newWomenDists.length + "</b> new women<br><b>" + newMenDists.length + "</b> new men")

    // console.log(isMobile.matches)
    if (isMobile.matches) {

        var photoShowCnt = 24;

        var oldPhotos = d3.selectAll(".old-members img")
        var newPhotos = d3.selectAll(".new-members img")

        oldPhotos.each(function(el, ind) {
            if (ind >= photoShowCnt) {
                d3.select(this).classed("hidden", true)
            }
        })

        newPhotos.each(function(el, ind) {
            if (ind >= photoShowCnt) {
                d3.select(this).classed("hidden", true)
            }
        })

        var showStatus = "hidden";


        d3.select(".show-hide")
            .html("&darr; Show more")
            .on('click', function() {



                var showHideImgs = d3.selectAll(".container-members img.hidden")

                console.log(d3.select('.show-hide').html())

                if (showStatus == "hidden") {
                    d3.select('.show-hide').html("&uarr; Show less")
                    showHideImgs.classed("show-img", true)
                    showStatus = "shown"
                } else {
                    d3.select('.show-hide').html("&darr; Show more")
                    showHideImgs.classed("show-img", false)
                    showStatus = "hidden"
                }

                pymChild.sendHeight();

            })




    }

}






window.onload = onWindowLoaded;
// window.onresize = render;
