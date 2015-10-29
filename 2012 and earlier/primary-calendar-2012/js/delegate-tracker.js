(function() {

// DELEGATE TRACKER
var delTotals = [];
var dt = $('#delTally');
var db = $('#delBars');
function loadGSContent(gsData) {
	console.log('loadGSContent');

	var $len = gsData.feed.entry.length;
	for (var i=0; i<$len; i++) {
		var rowInfo = '';
		
		// check if this is the "total" line, or a date
		var d = gsData.feed.entry[i].gsx$date.$t;
		if (d == "Total") {
			delTotals['romney'] = gsData.feed.entry[i].gsx$romney.$t;
			delTotals['gingrich'] = gsData.feed.entry[i].gsx$gingrich.$t;
			delTotals['paul'] = gsData.feed.entry[i].gsx$paul.$t;
			delTotals['santorum'] = gsData.feed.entry[i].gsx$santorum.$t;
			delTotals['huntsman'] = gsData.feed.entry[i].gsx$huntsman.$t;
			rowInfo += '<tr class="tot"><td><strong>Total<\/strong><\/td>';
			rowInfo += '<td class="amt">' + delTotals['romney'] + '<\/td>';
			rowInfo += '<td class="amt">' + delTotals['gingrich'] + '<\/td>';
			rowInfo += '<td class="amt">' + delTotals['paul'] + '<\/td>';
			rowInfo += '<td class="amt">' + delTotals['santorum'] + '<\/td>';
			rowInfo += '<td class="amt inactive last">' + delTotals['huntsman'] + '<\/td>';
			rowInfo += '<\/tr>';
		} else {
			rowInfo += '<tr>';
			rowInfo += '<td id="' + gsData.feed.entry[i].gsx$stateabbr.$t + '" class="st"><strong>' + gsData.feed.entry[i].gsx$state.$t + '<\/strong> <span class="details">' + d + ' | Delegates: ' + gsData.feed.entry[i].gsx$dels.$t + '<\/span><\/td>';
			rowInfo += '<td class="amt ' + hasDels(gsData.feed.entry[i].gsx$romney.$t) + '">' + gsData.feed.entry[i].gsx$romney.$t + '<\/td>';
			rowInfo += '<td class="amt ' + hasDels(gsData.feed.entry[i].gsx$gingrich.$t) + '">' + gsData.feed.entry[i].gsx$gingrich.$t + '<\/td>';
			rowInfo += '<td class="amt ' + hasDels(gsData.feed.entry[i].gsx$paul.$t) + '">' + gsData.feed.entry[i].gsx$paul.$t + '<\/td>';
			rowInfo += '<td class="amt ' + hasDels(gsData.feed.entry[i].gsx$santorum.$t) + '">' + gsData.feed.entry[i].gsx$santorum.$t + '<\/td>';
			rowInfo += '<td class="amt inactive ' + hasDels(gsData.feed.entry[i].gsx$huntsman.$t) + ' last">' + gsData.feed.entry[i].gsx$huntsman.$t + '<\/td>';
			rowInfo += '<\/tr>';
		}
		
		dt.append(rowInfo);
		addFootnotes(gsData.feed.entry[i].gsx$note.$t, d, gsData.feed.entry[i].gsx$stateabbr.$t);
	}
	dt.show();
	makeLeaderboard();
}

function hasDels(num) {
	var delClass;
	if (num > 0) {
		delClass = 'dels';
	} else {
		delClass = '';
	}
	return delClass;
}

function addFootnotes(n, d, s) {
	if (n.length > 0) {
		if (d == "Total") {
			db.before('<p class="updated">' + n + '<\/p>');
		} else {
			$('#' + s).append('<span class="note">' + n + '<\/span>');
			$('#' + s).find('strong').addClass('noted');
			$('#' + s).find('strong').hover(
				function (e) {
					$(this).siblings('.note').show();
					$(this).siblings('.note').css('top', e.pageY + 10);
					$(this).siblings('.note').css('left', e.pageX + 10);
				}, function (e) {
					$(this).siblings('.note').hide();
				}
			).siblings('.note').hide();
		}
	}
}

function makeLeaderboard() {
	db.append('<li><strong>Mitt Romney<\/strong> <span><i>&nbsp;<\/i> <b>' + delTotals['romney'] + '<\/b><\/span><\/li>');
	db.append('<li><strong>Newt Gingrich<\/strong> <span><i>&nbsp;<\/i> <b>' + delTotals['gingrich'] + '<\/b><\/span><\/li>');
	db.append('<li><strong>Ron Paul<\/strong> <span><i>&nbsp;<\/i> <b>' + delTotals['paul'] + '<\/b><\/span><\/li>');
	db.append('<li><strong>Rick Santorum<\/strong> <span><i>&nbsp;<\/i> <b>' + delTotals['santorum'] + '<\/b><\/span><\/li>');
	db.append('<li class="inactive last"><strong>Jon Huntsman<\/strong> <span><i>&nbsp;<\/i> <b>' + delTotals['huntsman'] + '<\/b><\/span><\/li>');
	
	var b = db.find('li:eq(0)').find('span');
	var p = b.position();
	var w = b.width();
	
	$('#delBarMarker').css('top', p.top - 1).css('left', p.left + (w/2)).css('height', db.height()).show();
	$('#delBarLabel').css('top', ((p.top - 1) + $('#delBarMarker').height())).css('left', p.left + (w/2) - ($('#delBarLabel').width() / 2)).show();
	
	db.find('li:eq(0)').find('i').animate( { width: ((delTotals['romney'] / 2286) * 100) + '%' }, { duration: 500, easing: 'swing' } );
	db.find('li:eq(1)').find('i').animate( { width: ((delTotals['gingrich'] / 2286) * 100) + '%' }, { duration: 500, easing: 'swing' } );
	db.find('li:eq(2)').find('i').animate( { width: ((delTotals['paul'] / 2286) * 100) + '%' }, { duration: 500, easing: 'swing' } );
	db.find('li:eq(3)').find('i').animate( { width: ((delTotals['santorum'] / 2286) * 100) + '%' }, { duration: 500, easing: 'swing' } );
	db.find('li:eq(4)').find('i').animate( { width: ((delTotals['huntsman'] / 2286) * 100) + '%' }, { duration: 500, easing: 'swing' } );
}

})();
