// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});
}


allData = [];

function loadGSContent(gsData) {
    var $len = gsData.feed.entry.length;
    totalEntries = $len;
    //console.log("there are " + $len + " entries");

    //LOOP THRU GOOGLE DATA AND PUT INTO OBJECT
    for (var j=0; j<totalEntries; j++) {
        //console.log(gsData.feed.entry[j].gsx$id.$t);
        var counter = gsData.feed.entry[j].gsx$id.$t;
        allData[counter] = [ {
        myid: gsData.feed.entry[j].gsx$id.$t,
        title: gsData.feed.entry[j].gsx$title.$t,
        imgurl: gsData.feed.entry[j].gsx$imgurl.$t,
        desc: gsData.feed.entry[j].gsx$description.$t
        }];
    }
}


function onOver(dotClassNum) {
    //console.log(dotClassNum);
    $("." + dotClassNum + " .label").css("display", "block");
}

function onOut(dotClassNum) {
    //console.log(dotClassNum);
    $("." + dotClassNum + " .label").css("display", "none");
}

function showInfo(num) {
    $("#info #title").text(allData[num][0].title);
    $("#info #description").html(allData[num][0].desc);
    var img = new Image();
    img.src = allData[num][0].imgurl;
    $("#info #illustration").empty();
    $("#info #illustration").append(img);
}


/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    // renderGraphic({
    //     container: '#graphic',
    //     width: containerWidth,
    //     data: []
    // });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
