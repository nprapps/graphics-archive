// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    $('#oscars2012').find('#panel0').show().siblings('.oscarPanel').hide();
	$('#oscars2012').find('#panel0').find('li').click(function() {
		var thisMovie = $(this).attr('id');
		var thisId = thisMovie.substring(5);
		$('#panel' + thisId).show().siblings('.oscarPanel').hide();
		$('#panel' + thisId).find('.oscarTabs').find('li:eq(0)').trigger("click");

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
	});
	$('#oscars2012').find('.oscarPanel').find('.oscarHeader').find('h5').click(function() {
		$('#panel0').show().siblings('.oscarPanel').hide();

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
	});
	$('#oscars2012').find('.oscarPanel').find('.oscarTabs').find('li').click(function() {
		var tParent = $(this).parent().parent().parent();
		var tIndex = tParent.find('.oscarTabs').find('li').index(this);
		$(this).addClass('selected').siblings().removeClass('selected');
		switch(tIndex) {
			case 0:
				tParent.find('.oscarAbout').show().siblings('.oscarClips').hide().siblings('.oscarStories').hide();
				break;
			case 1:
				tParent.find('.oscarClips').show().siblings('.oscarAbout').hide().siblings('.oscarStories').hide();
				break;
			case 2:
				tParent.find('.oscarStories').show().siblings('.oscarClips').hide().siblings('.oscarAbout').hide();
				break;
		}

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
	});
	$('#oscars2012').find('.oscarPanel').find('.oscarTabs').find('li:eq(0)').trigger("click");

	$('#oscars2012').find('#oscarFooter').find('b').click(function() {
		var tParent = $(this).parent();
		var tIndex = tParent.find('b').index(this);
		switch(tIndex) {
			case 0:
				$('#panel1').show().siblings('.oscarPanel').hide();
				break;
			case 1:
				$('#panel2').show().siblings('.oscarPanel').hide();
				break;
			case 2:
				$('#panel3').show().siblings('.oscarPanel').hide();
				break;
			case 3:
				$('#panel4').show().siblings('.oscarPanel').hide();
				break;
			case 4:
				$('#panel5').show().siblings('.oscarPanel').hide();
				break;
			case 5:
				$('#panel6').show().siblings('.oscarPanel').hide();
				break;
			case 6:
				$('#panel7').show().siblings('.oscarPanel').hide();
				break;
			case 7:
				$('#panel8').show().siblings('.oscarPanel').hide();
				break;
			case 8:
				$('#panel9').show().siblings('.oscarPanel').hide();
				break;
		}
//		window.location.hash=null;
//		window.location.hash="oscarContent";
		scrollTo(0,0);

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
	});

//	$('#oscars2012').find('#panel0').find('li:eq(1)').trigger("click");

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
