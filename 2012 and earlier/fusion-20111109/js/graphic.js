// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    nukeInit();
}

function nukeInit() {
	var nukeCurrent = 1;
	var nukeNumUpdates = $('#nukeDaily .update').length;

	// number indicators
	var nukeNumText = '';
	for (var e = 1; e <= nukeNumUpdates; e++) {
		if (e == 1) {
			nukeNumText += '<b class="nukeNum' + e + '">INTRO</b>';
		} else {
			nukeNumText += '<b class="nukeNum' + e + '">' + (e - 1) + '</b>';
		}
	}
	$('#nukeBack').after('<span id="nukeNums">' + nukeNumText + '</span>');

	$('#nukeNext').click(function() {
		nukeCurrent++;
		if ($(this).text() == 'restart') {
			resetNukeButtons();
		} else if ( nukeCurrent == nukeNumUpdates ) {
			$('#nukeDaily .update:eq(' + (nukeCurrent - 1) + ')').show().siblings().hide();
			$(this).text('restart');
		} else {
			$('#nukeDaily .update:eq(' + (nukeCurrent - 1) + ')').show().siblings().hide();
			$(this).text('next');
			$('#nukeBack').show();
		}
		$('#nukeNums b').removeClass('nukeActive');
		$('#nukeNums b.nukeNum' + nukeCurrent).addClass('nukeActive');

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }

		return false;
	});

	$('#nukeBack').click(function() {
		nukeCurrent--;
		if (nukeCurrent == 1) {
			resetNukeButtons();
		} else {
			$('#nukeDaily .update:eq(' + (nukeCurrent - 1) + ')').show().siblings().hide();
			$('#nukeNums b').removeClass('nukeActive');
			$('#nukeNums b.nukeNum' + nukeCurrent).addClass('nukeActive').siblings('b').removeClass('nukeActive');
			$('#nukeNext').text('next');
		}

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }

		return false;
	});

	function resetNukeButtons() {
		nukeCurrent = 1;
		$('#nukeDaily .update:eq(0)').show().siblings().hide();
		$('#nukeBack').hide();
		$('#nukeNext').text('next');
		$('#nukeNums b.nukeNum' + nukeCurrent).addClass('nukeActive').siblings('b').removeClass('nukeActive');

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
	}

	resetNukeButtons();
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
