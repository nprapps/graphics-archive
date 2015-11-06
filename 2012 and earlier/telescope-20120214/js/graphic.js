// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    teleInit();
}

function teleInit() {
	var teleCurrent = 1;
	var teleNumUpdates = $('#telescope-content .update').length;

	// number indicators
	var teleNumText = '';
	for (var e = 1; e <= teleNumUpdates; e++) {
		teleNumText += '<b class="teleNum' + e + '">' + e + '</b>';
	}

	$('#teleBack').after('<span id="teleNums">' + teleNumText + '</span>');

	$('#teleNext').click(function() {
		teleCurrent++;
		if ($(this).text() == 'restart') {
			resetteleButtons();
		} else if ( teleCurrent == teleNumUpdates ) {
			$('#telescope-content .update:eq(' + (teleCurrent - 1) + ')').show().siblings().hide();
			$(this).text('restart');
		} else {
			$('#telescope-content .update:eq(' + (teleCurrent - 1) + ')').show().siblings().hide();
			$(this).text('next');
			$('#teleBack').show();
		}
		$('#teleNums b').removeClass('teleActive');
		$('#teleNums b.teleNum' + teleCurrent).addClass('teleActive');

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
		return false;
	});

	$('#teleBack').click(function() {
		teleCurrent--;
		if (teleCurrent == 1) {
			resetteleButtons();
		} else {
			$('#telescope-content .update:eq(' + (teleCurrent - 1) + ')').show().siblings().hide();
			$('#teleNums b').removeClass('teleActive');
			$('#teleNums b.teleNum' + teleCurrent).addClass('teleActive').siblings('b').removeClass('teleActive');
			$('#teleNext').text('next');
		}

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
		return false;
	});

	function resetteleButtons() {
		teleCurrent = 1;
		$('#telescope-content .update:eq(0)').show().siblings().hide();
		$('#teleBack').hide();
		$('#teleNext').text('next');
		$('#teleNums b.teleNum' + teleCurrent).addClass('teleActive').siblings('b').removeClass('teleActive');

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
	}

	resetteleButtons();
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
