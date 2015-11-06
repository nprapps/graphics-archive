// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    var candies = [];
    var candyQuestions = $('#candyQuiz').find('.candyQ');
    var candyNumQuestions = candyQuestions.length;
    $('#candyList').find('li').each(function(index) {
        var id = $(this).attr('id').substring(1);
        candies[id] = { name: $(this).find('h4:first').text(),
                        desc: $(this).find('span:first').html(),
                        date: $(this).find('em:first').text(),
                        link: $(this).find('a:first').attr('href'),
                        img:  $(this).find('img').attr('src'),
                        total: 0
                       };
    });
    //$('#candyList').hide();
    $('#candyQuiz').find('#candyQ1').show();

    // randomize answers
    candyQuestions.find('ul').each(function() {
        var u = $(this);
        var uli = u.children('li');
        uli.sort(function(a,b) {
            var temp = parseInt( Math.random()*10 );
            var isOddOrEven = temp%2;
            var isPosOrNeg = temp>5 ? 1 : -1;
            return( isOddOrEven*isPosOrNeg );
        }).appendTo(u);
    });

    // user picks an answer
    candyQuestions.find('li').click(function() {
        var candyThis = parseInt($(this).parent().parent().attr('id').substring(6));
        if ($(this).parent().parent().hasClass('active')) {
            var cId = $(this).attr('class').substring(2);
            candies[cId].total++;

            $(this).addClass('selected').siblings('li').removeClass('selected').parent().parent().removeClass('active');
            $(this).unbind().siblings('li').unbind();
        }
        if (candyThis < candyNumQuestions) {
            // advance to the next question
            $('#candyQuiz').find('#candyQ' + candyThis).hide();
            $('#candyQuiz').find('#candyQ' + (candyThis + 1)).show();
        } else {
            // answered me these questions three
            candyShowAnswer();
        }

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    });

    // show the result
    function candyShowAnswer() {
        // hide questions
        candyQuestions.hide();
        // check answers
        var candyFinal;
        var candyPossible = [];
        for (var c in candies) {
            if (candies[c].total >= (candyNumQuestions - 1)) {
                candyFinal = c;
                break;
            } else if (candies[c].total > 0) {
                candyPossible.push( { id: c, total: candies[c].total } );
            }
        }
        if (candyFinal == undefined) {
            candyPossible.sort(function() {return 0.5 - Math.random()});
            candyFinal = candyPossible[0].id;
        }
        // show response
        var candyInfo = candies[candyFinal];
        var candyDesc = '<div id="candyAnswer">';
        if (candyInfo.link != undefined) {
            candyDesc += '<a href="' + candyInfo.link + '">';
        }
        candyDesc += '<img src="' + candyInfo.img + '" alt="Photo of ' + candyInfo.name + '" />';
        if (candyInfo.link != undefined) {
            candyDesc += '<\/a>';
        }
        candyDesc += '<div class="bucketwrap">';
        candyDesc += '<h3>You are a <span>' + candyInfo.name + '<\/span><\/h3>';
        candyDesc += '<p>' + candyInfo.desc;
        if (candyInfo.date != undefined) {
            candyDesc += ' <em>' + candyInfo.date + '<\/em>';
        }
        candyDesc += '<\/p>';
        if (candyInfo.link != undefined) {
            candyDesc += '<p class="more"><a href="' + candyInfo.link + '">Learn More About This Candy<\/a><\/p>';
        }
        candyDesc += '<\/div><\/div>';
        $('#candyQ3').before(candyDesc);

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
