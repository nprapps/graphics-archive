// vars
var $quiz = null;
var $results = null;
var pymChild = null;

var numQuestions = 0;
var numTaken = 0;
var numCorrect = 0;
var numRemaining = 0;


/*
 * Init
 */
var onWindowLoaded = function() {
    // init pym
    pymChild = new pym.Child({ });
    
    // set vars
    $quiz = $('#quiz');
    $results = $('#results');
    numQuestions = $quiz.find('div.question').length;
    
    // init quiz
    $quiz.find('li strong').on('click', onAnswerClicked);
};


/*
 * Quiz
 */
var onAnswerClicked = function() {
    var $thisAnswer = $(this);
    var $thisQuestion = $thisAnswer.parents('.question');
    var $allAnswers = $thisQuestion.find('strong');
    var resultsMsg = '';

    // register that this question has been answered
    $thisQuestion.addClass('answered');
    numTaken++;
    numRemaining = numQuestions - numTaken;
    $allAnswers.unbind('click');
    
    // check if the user selected the correct answer
    var gotItRight = $thisAnswer.parent('li').hasClass('correct');
    
    // tell the user if they got it right
    if (gotItRight) {
        $thisAnswer.prepend('<b>' + LBL_RIGHT + '</b> ');
        numCorrect++;
    } else {
        $thisAnswer.prepend('<b>' + LBL_WRONG + '</b> ');
    }

    // if all questions have been answered, show a rewarding message
    if (numTaken == numQuestions) {
        resultsMsg = '<strong>You got ' + numCorrect + ' (of ' + numQuestions + ') right.</strong> ';
        
        if (numCorrect <= 4) {
            resultsMsg += '<em>' + FINAL_LOW + '</em>';
        } else if (numCorrect >= 5 && numCorrect <= 9) {
            resultsMsg += '<em>' + FINAL_MID + '</em>';
        } else if (numCorrect >= 10) {
            resultsMsg += '<em>' + FINAL_HIGH + '</em>';
        }
    // otherwise, show their status
    } else {
        resultsMsg = 'You\'ve answered ' + numTaken + ' of ' + numQuestions + ' questions. Keep going!';
    }
    $results.html(resultsMsg);

    // update the iframe height
    if (pymChild) {
        pymChild.sendHeight();
    }
}
 

/*
 * Check for window load
 */
$(window).load(onWindowLoaded);
