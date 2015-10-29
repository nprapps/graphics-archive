// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {

    pymChild = new pym.Child({});

    // // load live results
    // $('#utresults').load('/buckets/agg/series/2012/elections/results/results-twocol-UTR0.html');

    $.urlParam = function(name){
        var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
            results = 'calendar';
        }
        return results[1] || 0;
    }
    var t = $.urlParam('tab');

    $('#pcTabs li').click(function() {
        var tIndex = $('#pcTabs li').index(this);
        $(this).addClass('selected').siblings('li').removeClass('selected');
        switch (tIndex) {
            case 0:
                $('#primaryCalendar').show();
                $('#delegateTracker').hide();
                break;
            case 1:
                $('#primaryCalendar').hide();
                $('#delegateTracker').show();
                break;
        }

        if (pymChild) {
            pymChild.sendHeight();
        }
    });
    switch (t) {
        case 'calendar':
            $('#pcTabs li:eq(0)').trigger('click');
            break;
        case 'delegates':
            $('#pcTabs li:eq(1)').trigger('click');
            break;
        default: // 'delegates'
            $('#pcTabs li:eq(1)').trigger('click');
            break;
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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
