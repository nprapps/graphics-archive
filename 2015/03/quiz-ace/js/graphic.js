var pymChild = null;
var score = 0;
var currentQuestion = 1;

var $buttons = null;
var $score = null;
var $reset = null;
var $slides = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

/*
 * Render the graphic
 */
function render(width) {
    // TODO: draw your graphic
    
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Handle clicks
 */
function onButtonClick(e) {
    e.preventDefault();

    var $parent = $(this).parents('.slide').first();

    $parent.removeClass('in').addClass('out');
    $slides.not($parent).removeClass('out');
    $parent.next().addClass('in');

    // Add one to score if yes button
    if ($(this).text() === 'Yes') {
        score++;
    }

    if ($parent.hasClass('intro')) {
        _gaq.push(['_trackEvent', 'ace-quiz', 'Started quiz']);
    } else if ($parent.hasClass('question')) {
        // Set quiz state to done if user answers the last question
        if ($parent.hasClass('question-10')) {
            $parent.parent().addClass('quiz-done');

            // Update score slide text
            $score.text(score);
        } else {
            $parent.parent().removeClass('quiz-done');
        }

        _gaq.push(['_trackEvent', 'ace-quiz', 'Answered question ' + currentQuestion]);
        currentQuestion++;
    }
}

/*
 * Reset the quiz
 */
function onResetClick(e) {
    e.preventDefault();

    var $parent = $(this).parents('.slide').first();
    score = 0;
    currentQuestion = 1;

    $slides.removeClass('in out');
    $parent.addClass('out');
    $slides.first().next().addClass('in');

    $score.text(score);

    _gaq.push(['_trackEvent', 'ace-quiz', 'Reset quiz']);
}

/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    pymChild = new pym.Child({
        renderCallback: render
    });

    $buttons = $('.btn');
    $slides = $('.slide');
    $score = $('.js-score');
    $reset = $('.js-reset');

    $buttons.on('click', onButtonClick);
    $reset.on('click', onResetClick);
})

/*
 * Google Analytics
 */
 var GOOGLE_ANALYTICS = {
     'ACCOUNT_ID': 'UA-5828686-4',
     'DOMAIN': 'apps.npr.org',
     'TOPICS': ''
 }

var _gaq = _gaq || [];
_gaq.push(['_setAccount', GOOGLE_ANALYTICS.ACCOUNT_ID]);
_gaq.push(['_setDomainName', GOOGLE_ANALYTICS.DOMAIN]);
//_gaq.push(['_setCustomVar', 1, 'BC', '', 3]);
_gaq.push(['_setCustomVar', 2, 'Topics', GOOGLE_ANALYTICS.TOPICS, 3]);
//_gaq.push(['_setCustomVar', 3, 'Program ID', '', 3]);
//_gaq.push(['_setCustomVar', 3, 'Localization', '', 1]);
_gaq.push(['_setCustomVar', 4, 'OrgID', '1', 3]);
_gaq.push(['_setCustomVar', 5, 'Page Types', '1', 3]);

(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
