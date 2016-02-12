// Global vars
var pymChild = null;
var isMobile = false;
var $quiz = null;
var $results = null;

var numQuestions = 0;
var numTaken = 0;
var numCorrect = 0;
var numRemaining = 0;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    $quiz = $('#quiz');
    $results = $('#results');
    numQuestions = $quiz.find('div.question').length;

    // init quiz
    $quiz.find('li.q-choice strong').on('click', onAnswerClicked);
    $quiz.find('#submit-1').on('click', onCheckSubmitted);
    $quiz.find('li.q-input input[name="submit-btn-1"]').on('click', onCheckSubmitted);
    $quiz.find('#submit-2').on('click', onInputSubmitted);
    $quiz.find('li.q-input input[name="submit-btn-2"]').on('click', onInputSubmitted);
}

/*
 * Quiz
 */
var onCheckSubmitted = function(e) {
    e.preventDefault();

    var $thisSubmit = $('#submit-1');

    if (!$thisSubmit.hasClass('disabled')) {
        var $checkboxes = $('li.q-check input.q-checkbox');
        var $correct = $('li.q-check input.q-checkbox:checked[data-answer="correct"]');
        var $incorrect = $('li.q-check input.q-checkbox:checked[data-answer="incorrect"]');
        var $thisAnswer = $thisSubmit.parents('li');
        var $thisQuestion = $thisSubmit.parents('.question');

        $thisQuestion.addClass('answered');
        numTaken++;
        numRemaining = numQuestions - numTaken;
        $thisSubmit.addClass('disabled');
        $checkboxes.prop('disabled', true);

        // check if the user selected the correct answer
        var gotItRight = $correct.length == 3;

        // tell the user if they got it right
        $correct.siblings('span').addClass('correct');
        $correct.siblings('span').prepend('<b>' + LBL_RIGHT + '</b> ');
        numCorrect++;
        $incorrect.siblings('span').addClass('incorrect');
        $incorrect.siblings('span').prepend('<b>' + LBL_WRONG + '</b> ');

        //updateQuestionCount();

        // update the iframe height
        if (pymChild) {
            pymChild.sendHeight();
        }
    }
};

var onInputSubmitted = function(e) {
    e.preventDefault();

    var $thisSubmit = $('#submit-2');

    if (!$thisSubmit.hasClass('disabled')) {
        var $thisInput = $quiz.find('li input[name="answer-2"]');
        var $thisAnswer = $thisInput.parents('li');
        var $thisQuestion = $thisSubmit.parents('.question');
        var submittedAnswer = parseInt($thisInput.val());
        var correctAnswer = parseInt($thisInput.data('answer'));

        $thisQuestion.addClass('answered');
        numTaken++;
        numRemaining = numQuestions - numTaken;
        $thisSubmit.addClass('disabled');
        $thisInput.prop('disabled', true);

        // check if the user selected the correct answer
        var gotItRight = submittedAnswer == correctAnswer;

        // tell the user if they got it right
        if (gotItRight) {
            $thisAnswer.addClass('correct');
            $thisAnswer.prepend('<b>' + LBL_RIGHT + '</b> ');
            numCorrect++;
        } else {
            $thisAnswer.addClass('incorrect');
            $thisAnswer.prepend('<b>' + LBL_WRONG + '</b> ');
        }

        //updateQuestionCount();

        // update the iframe height
        if (pymChild) {
            pymChild.sendHeight();
        }
    }
};

var onAnswerClicked = function() {
    var $thisAnswer = $(this);
    var $thisQuestion = $thisAnswer.parents('.question');
    var $allAnswers = $thisQuestion.find('strong');

    // register that this question has been answered
    $thisQuestion.addClass('answered');
    numTaken++;
    numRemaining = numQuestions - numTaken;
    $allAnswers.unbind('click');

    // check if the user selected the correct answer
    var gotItRight = $thisAnswer.parent('li').hasClass('correct');

    // tell the user if they got it right
    if (gotItRight) {
        $thisQuestion.find('li.correct strong').prepend('<b>' + LBL_RIGHT + '</b> ');
        numCorrect++;
    } else {
        $thisAnswer.prepend('<b>' + LBL_WRONG + '</b> ');
    }

    //updateQuestionCount();

    // update the iframe height
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var updateQuestionCount = function() {
    var resultsMsg = '';
    // if all questions have been answered, show a rewarding message
    if (numTaken == numQuestions) {
        resultsMsg = '<strong>You got ' + numCorrect + ' (of ' + numQuestions + ') right.</strong> ';

    // otherwise, show their status
    } else {
        resultsMsg = 'You\'ve answered ' + numTaken + ' of ' + numQuestions + ' questions. Keep going!';
    }
    $results.html(resultsMsg);

    // update the iframe height
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
