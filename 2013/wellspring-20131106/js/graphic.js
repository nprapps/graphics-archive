// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});
    wellspringInit();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

function wellspringInit() {
	var wellspringCurrent = 1;
	var wellspringNumUpdates = $('#wellspring-outer-wrapper .update').length;

	// number indicators
	var wellspringNumText = '';
	for (var e = 1; e <= wellspringNumUpdates; e++) {
			wellspringNumText += '<b class="wellspringNum' + e + '">' + (e) + '</b>';
	}
	$('#wellspringBack').after('<span id="wellspringNums">' + wellspringNumText + '</span>');

	$('#wellspringNext').click(function() {
		wellspringCurrent++;
		if ($(this).text() == 'restart') {
			resetwellspringButtons();
		} else if ( wellspringCurrent == wellspringNumUpdates ) {
			$('#wellspring-outer-wrapper .update:eq(' + (wellspringCurrent - 1) + ')').show().siblings().hide();
			$(this).text('restart');
		} else {
			$('#wellspring-outer-wrapper .update:eq(' + (wellspringCurrent - 1) + ')').show().siblings().hide();
			$(this).text('next');
			$('#wellspringBack').show();
		}
		$('#wellspringNums b').removeClass('wellspringActive');
		$('#wellspringNums b.wellspringNum' + wellspringCurrent).addClass('wellspringActive');
		return false;
	});

	$('#wellspringBack').click(function() {
		wellspringCurrent--;
		if (wellspringCurrent == 1) {
			resetwellspringButtons();
		} else {
			$('#wellspring-outer-wrapper .update:eq(' + (wellspringCurrent - 1) + ')').show().siblings().hide();
			$('#wellspringNums b').removeClass('wellspringActive');
			$('#wellspringNums b.wellspringNum' + wellspringCurrent).addClass('wellspringActive').siblings('b').removeClass('wellspringActive');
			$('#wellspringNext').text('next');
		}
		return false;
	});

	function resetwellspringButtons() {
		wellspringCurrent = 1;
		$('#wellspring-outer-wrapper .update:eq(0)').show().siblings().hide();
		$('#wellspringBack').hide();
		$('#wellspringNext').text('next');
		$('#wellspringNums b.wellspringNum' + wellspringCurrent).addClass('wellspringActive').siblings('b').removeClass('wellspringActive');
	}

	resetwellspringButtons();
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
