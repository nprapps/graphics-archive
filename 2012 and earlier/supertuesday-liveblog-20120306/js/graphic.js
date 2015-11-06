// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    var electionUpdates = function () {
        try{
    		var x = (new Date()).getTime();
            // var riverURL  = "/buckets/agg/series/2012/elections/riverofnews/fulllist-mar6.html?a=";
        	// var resultURL = "/buckets/agg/series/2012/elections/dashboard/mar6-results-bucket.html?a=";
    		var riverURL  = "fulllist-mar6.html?a=";
        	var resultURL = "mar6-results-bucket.html?a=";
    		var TIMEOUT   = 1000;
    		var TIMEOUT2  = 60000;

    		$('#election_river').load(riverURL+x);
    		$("#election_results").load(resultURL+x);
    		$('#election_river').before('<div id="election_river_alert"></div>');
    		$('#election_river').after('<div id="election_river_hold"></div>');
    		$("#election_results").before('<div id="election_timer"></div>');
    		$('#election_river_alert').hide();
    		$('#election_river_hold').hide();

    		var refreshId = setInterval(function() {
    			var y = (new Date()).getTime();
    			$('#election_river').load(riverURL+y);
    			$("#election_results").load(resultURL+y);
    			clearInterval(refreshId);

    			var refreshId2 = setInterval(function() {
    				var z = (new Date()).getTime();
    				$('#election_river_hold').load(riverURL+z, function() {
    					var numUpdates = $('#election_river').find('li').length;
    					var newUpdates = $('#election_river_hold').find('li').length;

    					// Check if more updates are available
    					if (newUpdates > numUpdates) {
    						var numDiff = newUpdates - numUpdates;
    						var alertText;
    						if (numDiff > 0) {
    							if (numDiff == 1) {
    								alertText = '<p>There is ' + numDiff + ' new update. Click to load.</p>';
    							} else {
    								alertText = '<p>There are ' + numDiff + ' new updates. Click to load.</p>';
    							}
    						} else {
    							alertText = '<p>This feed has been updated. Click to reload.</p>';
    						}
    						$('#election_river_alert').html(alertText);
    						$('#election_river_alert').show();
    						$('#election_river_alert').click(function() {
    							$('#election_river').html( $('#election_river_hold').html() );
    							$(this).hide();
    						});
    					}
    				});
    				timerCounter = TIMEOUT2 / 1000;

    				$("#election_results").load(resultURL+z);
    			}, TIMEOUT2);

    			var timerCounter = TIMEOUT2 / 1000;
    			var timerRefresh = setInterval(function() {
    				if (timerCounter > 0) {
    					timerCounter--;
    				}
    				var timerText = 'Refreshes in 00:';
    				if (timerCounter < 10) {
    					timerText += '0' + timerCounter;
    				} else {
    					timerText += timerCounter;
    				}
    				$('#election_timer').html(timerText);
    			}, 1000);

                // Update iframe
                if (pymChild) {
                    pymChild.sendHeight();
                }
    		}, TIMEOUT);

    	}
    	catch(e){}
    };
    electionUpdates();
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
