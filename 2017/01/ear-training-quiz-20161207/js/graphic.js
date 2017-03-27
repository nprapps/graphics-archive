var pymChild = null;

var $audioPlayer = null;
var $quiz = null;
var $btns = null;
var $players = null;
var $checkboxes = null;
var $result = null;
var questionTemplate = null;
var resultTemplate = null;
var shuffledQuiz = null;
var score = 0;
var questionsAnswered = null;
var $bonus = null;
var $bonusAnswers = null;
var correctAnswer = null;
var $resetBtn;

/*
 * Render the graphic
 */
function render(width) {
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var toggleAudio = function(e) {
    var $this = $(this);
    var $thisPlayer = $this.parent().next().children('.player');
    var answer = $thisPlayer.data('answer');
    var questionIndex = $this.parents('.question').data('index');

    var src = shuffledQuiz[questionIndex]['answers'][answer];

    var currentSrc = $audioPlayer.data().jPlayer.status.src.split('/');
    currentSrc = currentSrc[currentSrc.length - 1];

    if (currentSrc === src && !$audioPlayer.data().jPlayer.status.paused) {
        $audioPlayer.jPlayer('stop');
        $this.removeClass('stop').addClass('play');
        $thisPlayer.removeClass('currently-playing');
        $thisPlayer.find('.progress').width(0);
        ANALYTICS.trackEvent('clip-stopped', src);
    } else {
        $btns.removeClass('stop').addClass('play');
        $players.removeClass('currently-playing');
        $players.find('.progress').width(0);

        $audioPlayer.jPlayer('setMedia', {
            mp3: 'assets/' + src
        }).jPlayer('play');

        $this.removeClass('play').addClass('stop');
        $thisPlayer.addClass('currently-playing');

        ANALYTICS.trackEvent('clip-started', src);
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

    ANALYTICS.trackEvent('clip-seeked');
}

var onTimeupdate = function(e) {
    var totalTime = e.jPlayer.status.duration;
    var position = e.jPlayer.status.currentTime;
    var percentage = (position / totalTime) * 100;

    for (var i = 0; i < $btns.length; i++) {
        var $thisPlayer = $btns.eq(i).parent().next().children('.player');

        if ($thisPlayer.hasClass('currently-playing')) {
            $thisPlayer.find('.progress').css({
                'width': percentage + '%'
            });
        }
    }
}

var onAudioEnded = function(e) {
    $players.removeClass('currently-playing');
    $btns.removeClass('stop').addClass('play');
    $players.find('.progress').width(0);
    ANALYTICS.trackEvent('clip-ended');
}

var onCheckboxClick = function(e) {
    // get all our ducks in a row
    var $this = $(this);

    // if this question has already been answered, return
    if ($this.parents('.question').hasClass('disabled')) {
        return false;
    }

    var clickedAnswer = $this.parent().prev().children('.player').data('answer');
    var questionIndex = $this.parents('.question').data('index');
    var $answers = $this.parents('.answers').find('ul li.answer');

    for (var i = 0; i < $answers.length; i++) {
        $answers.eq(i).find('.checkbox').addClass('selected');
        var answerCheck = $answers.eq(i).find('.player').data('answer');
        var answerSrc = shuffledQuiz[questionIndex]['answers'][answerCheck];
        var slug = answerSrc.split('.')[0].split('_');
        var quality = slug.pop().split('-').join(' ');

        $answers.eq(i).find('.player .txt')
            .text(toTitlecase(quality))
            .addClass('answered');
    }

    // disable this question from future clicks
    $this.parents('.question').addClass('disabled');
    questionsAnswered = questionsAnswered + 1;

    // check to see if the answer clicked was correct
    var answerFile = shuffledQuiz[questionIndex]['answers'][clickedAnswer];

    ANALYTICS.trackEvent('clip-selected', answerFile);

    var correctAnswer = $this.parents('.question').data('slug');

    var answerSlug = answerFile.split('.')[0].split('_');
    var answerQuality = answerSlug.pop();

    if (answerQuality === correctAnswer) {
        $this.addClass('correct');
        score = score + 1;
    } else {
        $this.addClass('incorrect');

        // find the correct answer and highlight it
        for (var i = 0; i < $answers.length; i++) {
            var answer = $answers.eq(i).find('.player').data('answer');
            var answerFile = shuffledQuiz[questionIndex]['answers'][answer];
            var answerSlug = answerFile.split('.')[0].split('_');
            var answerQuality = answerSlug.pop();

            if (answerQuality === correctAnswer) {
                $answers.eq(i).find('.checkbox').text('');
                $answers.eq(i).find('.checkbox').addClass('correct');
                break;
            }
        }
    }
    // show the fact!
    var $fact = $this.parents('.question').next('.fact');
    $fact.velocity('slideDown', {
        duration: 200,
        progress: function() {
            if (pymChild) {
                pymChild.sendHeight();
            }
        }
    });

    if (questionsAnswered === 6) {
        var renderedResult = resultTemplate({
            'score': score ? score : '0'
        });

        $result.append(renderedResult);
        $result.velocity('slideDown', {
            duration: 200,
            progress: function() {
                if (pymChild) {
                    pymChild.sendHeight();
                }
            }
        });

        $resetBtn = $('.reset-btn');
        $resetBtn.on('click', onResetBtnClick);

        ANALYTICS.trackEvent('quiz-finish', score.toString());
    }
}

var renderQuiz = function() {
    shuffledQuiz = _.shuffle(QUIZ);

    for (var i = 0; i < shuffledQuiz.length; i++) {
        var answers = [shuffledQuiz[i]['correct'], shuffledQuiz[i]['option_2'], shuffledQuiz[i]['option_3']];
        var shuffledAnswers = _.shuffle(answers);

        shuffledQuiz[i]['answers'] = {
            'a': shuffledAnswers[0],
            'b': shuffledAnswers[1],
            'c': shuffledAnswers[2]
        }

        var renderedQuestion = questionTemplate({
            'question': shuffledQuiz[i],
            'index': i
        });

        $quiz.append(renderedQuestion);
    }

    $btns = $('#quiz .btn');
    $checkboxes = $('#quiz .checkbox');
    $players = $('#quiz .player');

    $btns.on('click', toggleAudio);
    $checkboxes.on('click touchend', onCheckboxClick);
    $players.on('click', onPlayerClick);
}

var sendHeight = function() {
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var onResetBtnClick = function() {
    ANALYTICS.trackEvent('reset-quiz');

    // reset all the things!
    $quiz.empty();
    $result.empty();
    $result.hide();

    $bonus.removeClass('disabled');
    $bonusAnswers.removeClass('correct');
    for (var i = 0; i < $bonusAnswers.length; i++) {
        $bonusAnswers.eq(i).text($bonusAnswers.eq(i).data('answer').toUpperCase());

    }
    $bonus.hide();

    score = 0;
    questionsAnswered = 0;
    renderQuiz();
    pymChild.scrollParentToChildPos(-20);
}

var toTitlecase = function(str) {
    return str.replace(/\w*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).on('load', function() {
    $audioPlayer = $('#audio');
    $quiz = $('#quiz');
    $bonus = $('.bonus');
    $result = $('.result');
    $bonusAnswers = $bonus.find('.answers ul li .letter');

    questionTemplate = _.template($('#question-template').html());
    resultTemplate = _.template($('#result-template').html());

    renderQuiz();

    $audioPlayer.jPlayer({
        ended: onAudioEnded,
        loop: false,
        supplied: 'mp3',
        timeupdate: onTimeupdate
    });

    pymChild = new pym.Child({
        renderCallback: render
    });
});