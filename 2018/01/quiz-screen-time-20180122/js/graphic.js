var pymChild = null;

var $quiz = null;
var $answers = null;
var $counter = null;
var $result = null;
var questionTemplate = null;
var resultTemplate = null;
var shuffledQuiz = null;
var scoreData = [
    {'category':'savvy','assigned':2,'answers':0},
    {'category':'softy','assigned':3,'answers':0},
    {'category':'strict','assigned':5,'answers':0},
    {'category':'struggler','assigned':7,'answers':0}
];
var scoringLookup = {};
var resultLookup = {};
var combined_score = 1;
var questionsAnswered = null;
var $resetBtn;

/*
 * Format data.
 */
var formatData = function() {
    QUIZ.forEach(function(d) {
        d['category_a'] = +d['category_a'].toString();
        d['category_b'] = +d['category_b'].toString();
        d['category_c'] = +d['category_c'].toString();
        d['category_d'] = +d['category_d'].toString();
    });

    SCORING.forEach(function(d) {
        scoringLookup[+d['score']] = +d['winner'];
    });

    RESULT.forEach(function(d) {
        resultLookup[+d['category']] = {'description': d['description'],
                                        'text': d['text'],
                                        'img': d['img'],
                                        'alt': d['alt']}
    });
}

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    $quiz = $('#quiz');
    $counter = $('#counter');
    $result = $('.result');

    questionTemplate = _.template($('#question-template').html());
    counterTemplate = _.template($('#counter-template').html());
    resultTemplate = _.template($('#result-template').html());

    if (Modernizr.svg) {
        formatData();

        renderQuiz();
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Render the graphic
 */
function render(width) {
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var onAnswerClick = function(e) {
    // get all our ducks in a row
    var $this = $(this);

    $this.addClass('clicked');
    // if this question has already been answered, return
    if ($this.parents('.question').hasClass('disabled')) {
        return false;
    }

    // disable this question from future clicks
    $this.parents('.question').addClass('disabled');
    questionsAnswered = questionsAnswered + 1;

    var category = $this.data('category');

    if (category != null) {
        // accumulate results arrays are 0 indexed
        scoreData[category-1]['answers'] += 1;
    }

    // update counter at bottom of quiz
    var renderedCounter = counterTemplate({
        count: questionsAnswered,
        total: QUIZ.length
    });

    $counter.html(renderedCounter);

    if (questionsAnswered === 1 && pymChild) {
        pymChild.sendHeight();
    }

    // Have finished the quiz
    if (questionsAnswered === QUIZ.length) {
        // calculate max
        var max = _.max(scoreData, function(cat) {
            return cat['answers'];
        });

        // use prime number combination to create a unique value
        _.each(scoreData, function(cat, i) {
            if (cat['answers'] === max['answers']) {
                combined_score = combined_score * cat['assigned'];
            }
        });

        var winner = scoringLookup[combined_score.toString()];

        $counter.html('');

        var renderedResult = resultTemplate({
            'result': resultLookup[winner]
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

        // Use imageLoaded as a jQuery plugin and sendheight when loaded.
        $result.imagesLoaded({},
            function() {
                if (pymChild) {
                    pymChild.sendHeight();
                }
        });

        $resetBtn = $('.reset-btn');
        $resetBtn.on('click', onResetBtnClick);
        ANALYTICS.trackEvent('quiz-finish', scoreData[winner-1]['category'], combined_score);
    }
}

var renderQuiz = function() {
    shuffledQuiz = _.shuffle(QUIZ);
    for (var i = 0; i < shuffledQuiz.length; i++) {
        var renderedQuestion = questionTemplate({
            'question': shuffledQuiz[i],
            'index': i,
            'total': QUIZ.length
        });
        $quiz.append(renderedQuestion);
    }

    $answers = $('#quiz .answer');
    $answers.on('click touchend', onAnswerClick);
}

var onResetBtnClick = function(e) {
    e.preventDefault();

    ANALYTICS.trackEvent('reset-quiz');

    // reset all the things!
    $quiz.empty();
    $result.empty();
    $result.hide();

    questionsAnswered = 0;
    combined_score = 1;
    _.each(scoreData, function(cat) {
        cat['answers'] = 0;
    })
    renderQuiz();
    pymChild.scrollParentToChildPos(-20);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
