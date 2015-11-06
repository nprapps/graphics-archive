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
    		// var riverURL  = "/buckets/agg/series/2012/elections/riverofnews/fulllist-feb28.html?a=";
    		// var resultURL = "/buckets/agg/series/2012/elections/results/results-full-MIR0.html?a=";
    		// var result2URL = "/buckets/agg/series/2012/elections/results/results-full-AZR0.html?a=";
            var riverURL  = "fulllist-feb28.html?a=";
    		var resultURL = "results-full-MIR0.html?a=";
    		var result2URL = "results-full-AZR0.html?a=";
    		var TIMEOUT   = 1000;

    		$('#election_river').load(riverURL+x);
    		$('#election_results_mi').load(resultURL+x);
    		$('#election_results_az').load(result2URL+x);
    		$('#election_river').before('<div id="election_river_alert"></div>');
    		$('#election_river').after('<div id="election_river_hold"></div>');
    		$('#election_river_alert').hide();
    		$('#election_river_hold').hide();

    		var refreshId = setInterval(function() {
    			var y = (new Date()).getTime();
    			$('#election_river').load(riverURL+y);
    			$('#election_results_mi').load(resultURL+y);
    			$('#election_results_az').load(result2URL+y);
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

    				$('#election_results_mi').load(resultURL+z);
    				$('#election_results_az').load(result2URL+z);
    			}, 60000);

                // Update iframe
                if (pymChild) {
                    pymChild.sendHeight();
                }
    		}, TIMEOUT);

            // Update iframe
            if (pymChild) {
                pymChild.sendHeight();
            }
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
