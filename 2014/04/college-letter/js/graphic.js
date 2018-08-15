// Global vars
var pymChild = null;
var isMobile = false;

var $btn_back;
var $btn_next;
var $counter;
var $explainer;
var $explainer_items;
var $letter;
var $graphic;

var current_item;
var total_items;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    $btn_back = $('#btn-back');
    $btn_next = $('#btn-next');
    $counter = $('#nav-counter');
    $explainer = $('#explainer');
    $explainer_items = $explainer.find('ul');
    $letter = $('#letter');
    $graphic = $('#graphic');

    current_item = 0;
    total_items = $explainer_items.find('li').length;

    goto_item(current_item);

    $btn_back.on('click', goto_prev_item);
    $btn_next.on('click', goto_next_item);

    pymChild = new pym.Child({
        renderCallback: render
    });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
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

    $graphic.width(containerWidth + 'px');

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

function goto_next_item() {
    var id = current_item + 1;
    if (id < total_items) {
        goto_item(id);
    }
}

function goto_prev_item() {
    var id = current_item - 1;
    if (id >= 0) {
        goto_item(id);
    }
}

function goto_item(id) {
    var $this_item = $explainer_items.find('li:eq(' + id + ')');
    var this_class = $this_item[0].className;

    $this_item.show().siblings('li').hide();
    $letter.find('.active').removeClass('active');
    $letter.find('.' + this_class).addClass('active flash').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
        $(this).removeClass('flash');
    });

    current_item = id;

    if (current_item == 0) {
        $btn_back.prop('disabled', true).addClass('inactive');
    } else {
        $btn_back.prop('disabled', false).removeClass('inactive');
    }

    if (current_item == (total_items - 1)) {
        $btn_next.prop('disabled', true).addClass('inactive');
    } else {
        $btn_next.prop('disabled', false).removeClass('inactive');
    }

    $counter.text((current_item + 1) + ' of ' + total_items);

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
