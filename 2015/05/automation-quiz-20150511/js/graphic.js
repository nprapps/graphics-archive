var $quizForm = null;
var $questions = null;
var $results = null;
var JOB_DATA_FINAL;
var pymChild = null;
var resultsTemplate = null;

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
 * Parse user scores from the UI.
 */
var parseScores = function() {
    var scores = {};

    for (var i = 0; i < $questions.length; i++) {
        var $q = $questions.eq(i);
        var category = $q.data('category');
        var $radio = $q.find('input:checked');

        if ($radio.length == 0) {
            alert('You must answer every question!');
            return null;
        }
        // Need to adjust so that 4 = 50, and 0 = 0.
        var value = (100*($radio.val() - 1))/ 6;

        scores[category] = value;
    }

    return scores;
}

/*
 * Order the JOB_DATA array by each jobs similarity to the provided scores.
 */
var sortJobsBySimilarity = function(scores) {
    // console.log(scores);

    for (var i = 0; i < JOB_DATA.length; i++) {
        var job = JOB_DATA[i];
        var sumOfSquares = 0;

        for (var j = 0; j < QUESTION_DATA.length; j++) {

            var question = QUESTION_DATA[j];
            var category = question['category'];

            // console.log('group')
            // console.log(question)
            // console.log(category)

            // cuz im nervous about string conversion
            var scale = +question['scale']
            var scaleAdjust = +question['scale-adjust']
            var quizScore = scores[category]
            var jobScore = +job[category]
            // console.log('scale', scale)
            // console.log('scaleAdjust', scaleAdjust)
            // console.log('scores', quizScore)
            // console.log('job', jobScore)

            // need to adjustment so that average = 50.
            // then subtract adjustment to quiz score
            var scoreAdjust = quizScore - scaleAdjust
            // need to scale BOTH input and scores in datatables
            var sumOfSquaresTemp = (jobScore  - scoreAdjust)/ Math.exp(question['scale'])
            sumOfSquares += Math.pow(sumOfSquaresTemp, 2);

        }
        sumOfSquares = Math.sqrt(sumOfSquares)
        // string wasn't converting to numeric...afraid that sorting wasn't working on strings.
        job.sumOfSquares = +sumOfSquares.toPrecision(7);
        // console.log('sumOfSquares', job.sumOfSquares)

    }

// sorting wasn't working so I changed it to this
    JOB_DATA.sort(function(a, b) {
        return a.sumOfSquares-b.sumOfSquares;
    });



    JOB_DATA_FINAL = JOB_DATA
    // console.log(JOB_DATA_FINAL)

    return JOB_DATA_FINAL

}

/*
 * Parse quiz results and display matching jobs.
 */
var onQuizSubmit = function() {
    var scores = parseScores();

    if (scores === null) {
        return false;
    }

    sortJobsBySimilarity(scores);

    $results.html(resultsTemplate());
    pymChild.sendHeight();

    return false;
}

/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    $quizForm = $('#quiz');
    $questions = $('.question');
    $results = $('#results');

    resultsTemplate = _.template($('#results-template').html())

    $quizForm.on('submit', onQuizSubmit);

    pymChild = new pym.Child({
        renderCallback: render
    });
})
