// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    genomeInit();
}

function genomeInit() {
	var genomeCurrent = 1;
	var genomeNumUpdates = $('#genomeDaily .update').length;

	// number indicators
	var genomeNumText = '';
	for (var e = 1; e <= genomeNumUpdates; e++) {
		genomeNumText += '<b class="genomeNum' + e + '">' + e + '</b>';
//		euroNumText += '<b class="euroNum' + e + '">&bull;</b>';
	}

	$('#genomeBack').after('<span id="genomeNums">' + genomeNumText + '</span>');

	$('#genomeNext').click(function() {
		genomeCurrent++;
		if ($(this).text() == 'restart') {
			resetgenomeButtons();
		} else if ( genomeCurrent == genomeNumUpdates ) {
			$('#genomeDaily .update:eq(' + (genomeCurrent - 1) + ')').show().siblings().hide();
			$(this).text('restart');
		} else {
			$('#genomeDaily .update:eq(' + (genomeCurrent - 1) + ')').show().siblings().hide();
			$(this).text('next');
			$('#genomeBack').show();
		}
		$('#genomeNums b').removeClass('genomeActive');
		$('#genomeNums b.genomeNum' + genomeCurrent).addClass('genomeActive');

        if (pymChild) {
            pymChild.sendHeight();
        }

        return false;
	});

	$('#genomeBack').click(function() {
		genomeCurrent--;
		if (genomeCurrent == 1) {
			resetgenomeButtons();
		} else {
			$('#genomeDaily .update:eq(' + (genomeCurrent - 1) + ')').show().siblings().hide();
			$('#genomeNums b').removeClass('genomeActive');
			$('#genomeNums b.genomeNum' + genomeCurrent).addClass('genomeActive').siblings('b').removeClass('genomeActive');
			$('#genomeNext').text('next');
		}

        if (pymChild) {
            pymChild.sendHeight();
        }

        return false;
	});

	function resetgenomeButtons() {
		genomeCurrent = 1;
		$('#genomeDaily .update:eq(0)').show().siblings().hide();
		$('#genomeBack').hide();
		$('#genomeNext').text('next');
		$('#genomeNums b.genomeNum' + genomeCurrent).addClass('genomeActive').siblings('b').removeClass('genomeActive');
	}

	resetgenomeButtons();

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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
