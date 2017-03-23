// Global vars
var pymChild = null;
var isMobile = false;

var timedAnalytics = {};

var $audioPlayer,
    $playerWrap,
    $player,
    $btn;

var pollAnswers = {
    'true': '.&rdquo;</strong> That&rsquo;s what Ben did. And then things got really strange. He took a risk, and it changed his life.',
    'false': ',&rdquo;</strong> but that&rsquo;s not what Ben did. He wrote back. Then, things got really strange. Still, he took a risk, and it changed his life.'
};

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({
        renderCallback: render
    });

    initPoll();

    $audioPlayer = $('#audio');
    initAudio($audioPlayer);

    $playerWrap = $('#player-wrapper');
    $btn = $playerWrap.find('.btn');
    $player = $playerWrap.find('.player');

    $btn.on('click', toggleAudio);
    $player.on('click', onPlayerClick);

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
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

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

var initPoll = function() {
    var $pollWrapper = $('#poll-wrapper'),
        $pollLis = $pollWrapper.find('li'),
        $pollBtns = $pollWrapper.find('a');

    var btn_done = false;

    var transitionEnd = function(prop) {
        if (!btn_done) {
            btn_done = true;

            var $unselected = $pollWrapper.find('.unselected-a');

            var finishCollapse = function() {
                $unselected.hide();
                if (pymChild) {
                    pymChild.sendHeight();
                }
            };

            if (isMobile) {
                collapseItem($unselected, ['height', 'margin-bottom'], finishCollapse);
            } else {
                collapseItem($unselected, ['width', 'padding-right'], finishCollapse);
            }
        }
    };

    var collapseItem = function($selector, props, callback) {
        var anim_data = {};
        for (i in props) {
            anim_data[props[i]] = 0;
        }
        $selector.animate(anim_data, 800, callback);
    };

    $pollLis.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', transitionEnd);

    $pollBtns.on('click', function(e) {
        e.preventDefault();

        if ($('#bottom-text').hasClass('audio-hide')) {
            var $parent_li = $(this).parent();
            //$parent_li.addClass('selected-a');
            $pollLis.addClass('unselected-a');

            var answer_text = $(this).text().slice(0,-1);
            ANALYTICS.trackEvent('poll-btn-clicked', answer_text);

            var answer_key = $parent_li.data('answer');
            var answer_html = 'You chose, <strong>&ldquo;' + answer_text + pollAnswers[answer_key];
            $('#poll-answer-text').html(answer_html);
            $('#bottom-text').removeClass('audio-hide');
        }
    });
};

var initAudio = function($audioPlayer) {
    $audioPlayer.jPlayer({
        ready: function() {
            $(this).jPlayer('setMedia', {
                mp3: 'https://pd.npr.org/anon.npr-mp3/npr/specials/2016/02/20160229_specials_firnus_and_ben__-_final_online_levels.mp3'
            });
        },
        loop: false,
        supplied: 'mp3',
        timeupdate: onTimeupdate,
        ended: onAudioEnded
    });

};

var toggleAudio = function(e) {
    var $this = $(this);

    if ($player.hasClass('init-play')) {
        $player.removeClass('init-play');
        ANALYTICS.trackEvent('audio-started', $audioPlayer.data().jPlayer.status.src);
    }

    if (!$audioPlayer.data().jPlayer.status.paused) {
        $audioPlayer.jPlayer('pause');
        $this.removeClass('pause').addClass('play');
        $player.removeClass('currently-playing');
        //$player.find('.progress').width(0);
    } else {
        $btn.removeClass('pause').addClass('play');
        $player.removeClass('currently-playing');
        //$player.find('.progress').width(0);

        $audioPlayer.jPlayer('play');

        $this.removeClass('play').addClass('pause');
        $player.addClass('currently-playing');
    }
}

var onPlayerClick = function(e) {
    if ($(e.target).hasClass('txt')) {
        var playerExtra = $(this).width() - 160;
        var percentage = (e.offsetX + playerExtra) / $(this).width();
    } else {
        var percentage = e.offsetX / $(this).width();
    }

    var clickedPosition = $audioPlayer.data().jPlayer.status.duration * percentage;

    $audioPlayer.jPlayer('play', clickedPosition);
    $btn.removeClass('play').addClass('pause');
    $player.addClass('currently-playing');
}

var onTimeupdate = function(e) {
    var totalTime = e.jPlayer.status.duration;
    var position = e.jPlayer.status.currentTime;
    var percentage = (position / totalTime) * 100;

    updateTimestamps(position);

    for (var i = 0; i < $btn.length; i++) {
        var $thisPlayer = $btn.eq(i).parent().next().children('.player');

        $thisPlayer.find('.progress').css({
            'width': percentage + '%'
        });
    }

    if (position > 10) {
        var timeBucket = getTimeBucket(position);
        if (!timedAnalytics[timeBucket]) {
            timedAnalytics[timeBucket] = true;
            ANALYTICS.trackEvent('audio-time-listened', $audioPlayer.data().jPlayer.status.src, timeBucket);
        }
    }
}

var updateTimestamps = function(position) {
    $player.find('.time-passed').text($.jPlayer.convertTime(position));
};

var onAudioEnded = function(e) {
    $player.removeClass('currently-playing');
    $btn.removeClass('pause').addClass('play');
    $player.find('.progress').width(0);
    ANALYTICS.trackEvent('audio-ended', $audioPlayer.data().jPlayer.status.src);
}

var getTimeBucket = function(seconds) {
    var minutes, timeBucket;
    if (seconds < 60) {
        var tensOfSeconds = Math.floor(seconds / 10) * 10;
        timeBucket = tensOfSeconds.toString() + 's';
    } else if (seconds >=60 && seconds < 300) {
        minutes = Math.floor(seconds / 60);
        timeBucket = minutes.toString() + 'm';
    } else {
        minutes = Math.floor(seconds / 60);
        var fivesOfMinutes = Math.floor(minutes / 5) * 5;
        timeBucket = fivesOfMinutes.toString() + 'm';
    }

    return timeBucket;
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
