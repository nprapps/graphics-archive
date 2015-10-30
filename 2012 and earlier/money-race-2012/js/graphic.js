// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    $("#res146180716 li").click(function() {
        var tIndex = $("#res146180716 li").index(this);
        $(this).addClass("selected").siblings("li").removeClass("selected");
        switch (tIndex) {
            case 0:
                $("#con146180764").show();
                $("#con146180734").hide();
                $("#con147198069").hide();
                $("#con149031962").hide();
                $("#con151210008").hide();
                $("#con153198746").hide();
                $("#con155508124").hide();
                $("#con157232197").hide();
                $("#con159539383").hide();
                $("#con161543900").hide();
                $("#con163565089").hide();
                break;
            case 1:
                $("#con146180764").hide();
                $("#con146180734").show();
                $("#con147198069").hide();
                $("#con149031962").hide();
                $("#con151210008").hide();
                $("#con153198746").hide();
                $("#con155508124").hide();
                $("#con157232197").hide();
                $("#con159539383").hide();
                $("#con161543900").hide();
                $("#con163565089").hide();
                break;
            case 2:
                $("#con146180764").hide();
                $("#con146180734").hide();
                $("#con147198069").show();
                $("#con149031962").hide();
                $("#con151210008").hide();
                $("#con153198746").hide();
                $("#con155508124").hide();
                $("#con157232197").hide();
                $("#con159539383").hide();
                $("#con161543900").hide();
                $("#con163565089").hide();
                break;
            case 3:
                $("#con146180764").hide();
                $("#con146180734").hide();
                $("#con147198069").hide();
                $("#con149031962").show();
                $("#con151210008").hide();
                $("#con153198746").hide();
                $("#con155508124").hide();
                $("#con157232197").hide();
                $("#con159539383").hide();
                $("#con161543900").hide();
                $("#con163565089").hide();
                break;
            case 4:
                $("#con146180764").hide();
                $("#con146180734").hide();
                $("#con147198069").hide();
                $("#con149031962").hide();
                $("#con151210008").show();
                $("#con153198746").hide();
                $("#con155508124").hide();
                $("#con157232197").hide();
                $("#con159539383").hide();
                $("#con161543900").hide();
                $("#con163565089").hide();
                break;
            case 5:
                $("#con146180764").hide();
                $("#con146180734").hide();
                $("#con147198069").hide();
                $("#con149031962").hide();
                $("#con151210008").hide();
                $("#con153198746").show();
                $("#con155508124").hide();
                $("#con157232197").hide();
                $("#con159539383").hide();
                $("#con161543900").hide();
                $("#con163565089").hide();
                break;
            case 6:
                $("#con146180764").hide();
                $("#con146180734").hide();
                $("#con147198069").hide();
                $("#con149031962").hide();
                $("#con151210008").hide();
                $("#con153198746").hide();
                $("#con155508124").show();
                $("#con157232197").hide();
                $("#con159539383").hide();
                $("#con161543900").hide();
                $("#con163565089").hide();
                break;
            case 7:
                $("#con146180764").hide();
                $("#con146180734").hide();
                $("#con147198069").hide();
                $("#con149031962").hide();
                $("#con151210008").hide();
                $("#con153198746").hide();
                $("#con155508124").hide();
                $("#con157232197").show();
                $("#con159539383").hide();
                $("#con161543900").hide();
                $("#con163565089").hide();
                break;
            case 8:
                $("#con146180764").hide();
                $("#con146180734").hide();
                $("#con147198069").hide();
                $("#con149031962").hide();
                $("#con151210008").hide();
                $("#con153198746").hide();
                $("#con155508124").hide();
                $("#con157232197").hide();
                $("#con159539383").show();
                $("#con161543900").hide();
                $("#con163565089").hide();
                break;
            case 9:
                $("#con146180764").hide();
                $("#con146180734").hide();
                $("#con147198069").hide();
                $("#con149031962").hide();
                $("#con151210008").hide();
                $("#con153198746").hide();
                $("#con155508124").hide();
                $("#con157232197").hide();
                $("#con159539383").hide();
                $("#con161543900").show();
                $("#con163565089").hide();
                break;
            case 10:
                $("#con146180764").hide();
                $("#con146180734").hide();
                $("#con147198069").hide();
                $("#con149031962").hide();
                $("#con151210008").hide();
                $("#con153198746").hide();
                $("#con155508124").hide();
                $("#con157232197").hide();
                $("#con159539383").hide();
                $("#con161543900").hide();
                $("#con163565089").hide();
                $("#con163565089").show();
                break;
        }

        if (pymChild) {
            pymChild.sendHeight();
        }
    });
    $("#res146180716 li:eq(10)").trigger("click");


    if (pymChild) {
        pymChild.sendHeight();
    }
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
 * Render a graphic.
 */
var renderGraphic = function(config) {
    var aspectWidth = 4;
    var aspectHeight = 3;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: 15
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Create container
    var chartElement = containerElement.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    // Draw here!
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
