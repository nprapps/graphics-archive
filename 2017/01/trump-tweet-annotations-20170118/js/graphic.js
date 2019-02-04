// Global vars
var pymChild = null;
var isMobile = false;
var parentUrl;
var checkedToday = false;
var trackedTweets = [];
var seenTweets = [];
// Debounce sendHeight messaging
var debouncedUpdateIFrame = null;
var DEBOUNCE_WAIT = 500;

var CLIPBOARD_TOOLTIP_SHOW_TIME = 1000;

var jsonPath = '//apps.npr.org/factcheck/annotations.json';
if (window.location.hostname && window.location.hostname == 'localhost') {
var jsonPath = '//stage-apps.npr.org/factcheck/annotations.json';
}

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({
        renderCallback: render
    });

    loadData();
    setupClipboardJS();

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
    pymChild.onMessage('visibility-available', onVisibilityAvailable);
    pymChild.onMessage('element-visible', onTweetVisible);
    pymChild.onMessage('request-bounding-client-rect', onBoundingClientRectRequest);
    pymChild.sendMessage('test-visibility-tracker', 'test');
}

var loadData = function() {
    var request = new XMLHttpRequest();
    request.overrideMimeType('application/json');
    request.open('GET', jsonPath, true);

    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            populatePage(JSON.parse(request.responseText));
        }
    }

    request.onerror = function() {
      console.error('request error');
    };

    request.send();
};

var setupClipboardJS = function() {
    var deeplinkUrl = new URI(pymChild.parentUrl);
    var clipboard = new Clipboard('.deeplink', {
        target: function(trigger) {
            var parent = trigger.parentElement;
            var id = trigger['id'].substring(3);
            var newQuery = deeplinkUrl.query(true);
            newQuery['post'] = id;
            deeplinkUrl.query(newQuery);

            var input = document.createElement('input');
            input.className = 'deeplink-input hidden';
            input.readonly = true;
            input.value = deeplinkUrl.href();

            if (!parent) {
                console.error('deeplink has no parent element');
                return null;
            } else {
                parent.appendChild(input);
                return input;
            }
        }
    });

    clipboard.on('success', function(e) {
        var deeplinkInput = document.querySelector('.deeplink-input');
        if (deeplinkInput) {
            deeplinkInput.remove();
        }

        var triggerTooltip = e.trigger.childNodes[1];
        setTimeout(hideTooltip, CLIPBOARD_TOOLTIP_SHOW_TIME);
        triggerTooltip.classList.add('visible');
        e.clearSelection();

        function hideTooltip() {
            triggerTooltip.classList.remove('visible');
        }

        // Track copy to clipboard usage
        var id = e.trigger['id'];
        ANALYTICS.trackEvent('copy-to-clipboard', id);
    });

    clipboard.on('error', function(e) {
        console.log('Press Ctrl+C to copy');
    });
};

var deeplinkScroll = function() {
    var parentUrl = new URI(pymChild.parentUrl);
    var postId = parentUrl.query(true)['post'];
    updateIFrame();

    if (postId) {
        var post = document.getElementById(postId);
        scrollToPost('#section-' + postId);
    }
};

var scrollToPost = function(id) {
    var el = document.querySelector(id);

    if (el) {
        var offset = 30;
        if (Modernizr.touchevents) {
            offset = 150;
        }

        var rect = el.getBoundingClientRect();
        pymChild.scrollParentToChildPos(rect.top - offset);
    }
};

var registerTrackers = function() {
    var tweetEmbeds = document.querySelectorAll('.embed-tweet');

    [].forEach.call(tweetEmbeds, function(embed) {
        var id = embed.getAttribute('id');

        if (trackedTweets.indexOf(id) === -1) {
            trackedTweets.push(id);
            pymChild.sendMessage('request-tracking', id);
        }
    });
}

var populatePage = function(data) {
    var sectionTemplate = _.template(document.getElementById('section-template').innerHTML);
    var separatorTemplate = _.template(document.getElementById('separator-template').innerHTML);
    var pageContents = [];
    var dateTracker;
    var annoCount = 0;

    _.each(data, function(d,i) {
        var dateCheck = checkForDateSeparator(d['claims'], dateTracker);
        if (dateCheck) {
            dateTracker = dateCheck;
            var dateText = createDateSeparator(dateTracker);
            var dateHTML = separatorTemplate(dateText);
            pageContents.push(dateHTML);
        }

        annoCount += d['claims'].length;

        var sectionHTML = sectionTemplate(d);
        pageContents.push(sectionHTML);
    });

    renderTopSummary(annoCount);

    document.getElementById('embed-wrap').innerHTML = pageContents.join('');

    debouncedUpdateIFrame();
    deeplinkScroll();
    registerTrackers();
};

var renderTopSummary = function(annoCount) {
    var topTemplate = _.template(document.getElementById('top-template').innerHTML);
    var countText = annoCount == 1 ? 'one tweet' : annoCount + ' tweets';
    document.getElementById('top-wrap').innerHTML = topTemplate({ count: countText });
};

var checkForDateSeparator = function(claims, dateTracker) {
    var latestDatetime = claims[claims.length - 1]['date'];
    var latestDate = latestDatetime.split('T')[0];

    if (latestDate !== dateTracker) {
        checkedToday = true;

        return latestDate;
    } else {
        return false;
    }
};

var zeroPad = function(number) {
    return number < 10 ? '0' + number : number;
};

var createDateSeparator = function(date) {
    var dateLabel;
    var todayDate = new Date();
    var todayDateString = todayDate.getFullYear() + '-' + zeroPad(todayDate.getMonth()+1) + '-' + zeroPad(todayDate.getDate());

    if (todayDateString == date) {
        dateLabel = 'Tweets from today';
    } else {
        var dateObj = new Date(date + 'T00:01:01-04:00');
        dateLabel = 'Tweets from ' + getAPMonth(dateObj) + ' ' + dateObj.getDate();
    }

    return { date_label: dateLabel };
};

var renderTweet = function(tweetWrapper) {
    if (window.twttr === undefined) return;

    var tweet = tweetWrapper.getElementsByClassName('tweet')[0];
    var tweetId = tweetWrapper.getAttribute('data-tweet-id');
    var tweetMedia = tweetWrapper.getAttribute('data-show-media') == 'true' ? true : 'hidden';
    tweetWrapper.removeAttribute('data-tweet-id');

    var tweetOptions = {
        conversation: 'none',
        cards: tweetMedia
    };

    // Create a tweet through twitter widgets factory function
    twttr.widgets.createTweet(tweetId, tweet, tweetOptions)
        .then(function(el) {
            tweetWrapper.classList.add('loaded');
            // Update the iframe height once loaded
            debouncedUpdateIFrame();
        }, function(reason) {
            console.log("error", reason);
        });
};

/*
 * Update pym iframe height
 */
var updateIFrame = function() {
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Debounce the sendHeight to the parent to avoid
 * too many events sent while the assets are being lazy loaded.
 */
debouncedUpdateIFrame = _.debounce(updateIFrame, DEBOUNCE_WAIT);

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

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();

        // Twitter adds a class to the tweet to adjust the CSS
        // This timeout accounts for that slight delay
        window.setTimeout(function() {
            pymChild.sendHeight();
        }, 100);
    }
}

var onVisibilityAvailable = function(id) {
    document.body.classList.remove('vis-not-available');
}

var onTweetVisible = function(id) {
    var tweet = document.getElementById(id);
    if (seenTweets.indexOf(id) === -1) {
        seenTweets.push(id);
        renderTweet(tweet);
    }
}

var onBoundingClientRectRequest = function(id) {
    var tweet = document.getElementById(id);

    var rect = tweet.getBoundingClientRect();
    var rectString = rect.top + ' ' + rect.left + ' ' + rect.bottom + ' ' + rect.right;
    pymChild.sendMessage(id + '-bounding-client-rect-return', rectString);

}
/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
