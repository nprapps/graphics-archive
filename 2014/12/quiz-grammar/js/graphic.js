var $answers;
var $graphic;
var pymChild = null;

var answered = 0;
var answeredRight = 0;

/*
 * INITIALIZE
 */
var onWindowLoad = function() {
    $graphic = $('#graphic');
    $answers = $graphic.find('.answer');
    
    $answers.on('click', onAnswerClick);
    
    pymChild = new pym.Child({ });
}

/*
 * CLICK ANSWERS
 */
var onAnswerClick = function(e) {
    var $a = $(e.target);
    var $q = $a.parents('.question');
    
    if ($a.hasClass('correct')) {
        $q.addClass('answered right');
        answeredRight++;
    } else {
        $q.addClass('answered wrong');
    }
    
    $q.find('.answer').unbind('click');
    answered++;
    
    if (answered == 5) {
        $graphic.append('<h3 class="result">You got <strong>' + answeredRight + '</strong> right!</h3>');
    }

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(onWindowLoad);