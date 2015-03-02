var $btn_back;
var $btn_next;
var $counter;
var $header;
var $slides;

var current_slide = null;
var num_slides = 0;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

function setup_slideshow() {
	// hide all the slides initially
	$slides.hide();

	// create the clicky stepper
	var stepper = '';
	stepper += '<div class="stepper">';
	stepper += '<button class="btn btn-back">&lt;<span> Back</span></button>';
	stepper += '<span class="counter"></span>';
	stepper += '<button class="btn btn-next"><span>Next </span>&gt;</button>';
	stepper += '<button class="btn btn-replay">Replay</button>';
	stepper += '</div>';
	
	// append it to the header
	$header.append(stepper);
	
	$btn_back = $('.btn-back');
	$btn_next = $('.btn-next');
	$btn_replay = $('.btn-replay');
	$counter = $('.counter');
	
	$btn_back.on('click', on_back_clicked);
	$btn_next.on('click', on_next_clicked);
	$btn_replay.on('click', on_replay_clicked);
	
	$btn_next.trigger('click');
}

function show_slide() {
	$slides.hide();
	$('.slide:eq(' + current_slide + ')').show();
	
	switch(current_slide) {
		case 0:
			$btn_back.hide();
			$btn_next.show();
			$btn_replay.hide();
			$counter.removeClass('completed');
			break;
		case (num_slides - 1):
			$btn_back.show();
			$btn_next.hide();
			$btn_replay.show();
			$counter.addClass('completed');
			break;
		default:
			$btn_back.show();
			$btn_next.show();
			$btn_replay.hide();
			$counter.removeClass('completed');
			break;
	}
	
	$counter.text( (current_slide + 1) + ' of ' + num_slides);
}

function on_next_clicked() {
	if (current_slide == null) {
		current_slide = 0;
		show_slide();
	} else if ((current_slide + 1) < num_slides) {
		current_slide++;
		show_slide();
	}
}

function on_back_clicked() {
	if (current_slide > 0) {
		current_slide--;
		show_slide();
	}
}

function on_replay_clicked() {
	current_slide = 0;
	show_slide();
}

function on_stepper_number_clicked() {
	current_slide = $(this).index('li');
	show_slide();
}


/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
	$header = $('header');
	$slides = $('.slide');
	num_slides = $slides.length;
	
	setup_slideshow();
    pymChild = new pym.Child({ });
})
