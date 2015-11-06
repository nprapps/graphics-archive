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
//            var riverURL  = "/buckets/agg/series/2012/sotu/fulllist-sotu.html?a=";
    		var riverURL  = "fulllist-sotu.html?a=";
    		var TIMEOUT   = 1000;

    		$('#the_river').load(riverURL+x);
    		$('#the_river').before('<div id="the_river_alert"></div>');
    		$('#the_river').after('<div id="the_river_hold"></div>');
    		$('#the_river_alert').hide();
    		$('#the_river_hold').hide();

    		var refreshId = setInterval(function() {
    			var y = (new Date()).getTime();
    			$('#the_river').load(riverURL+y);
    			clearInterval(refreshId);

    			var refreshId2 = setInterval(function() {
    				var z = (new Date()).getTime();
    				$('#the_river_hold').load(riverURL+z, function() {
    					var numUpdates = $('#the_river').find('li').length;
    					var newUpdates = $('#the_river_hold').find('li').length;

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
    						$('#the_river_alert').html(alertText);
    						$('#the_river_alert').show();
    						$('#the_river_alert').click(function() {
    							$('#the_river').html( $('#the_river_hold').html() );
    							$(this).hide();
    						});
    					}


    				});
    			}, 60000);

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
