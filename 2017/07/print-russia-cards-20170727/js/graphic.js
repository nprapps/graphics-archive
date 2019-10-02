// Global vars
var pymChild = null;
var isMobile = Modernizr.touchevents;
var BASE_URL = null;
var cards = null;
var cardTimer = null;
var cardsTitle = null;
var cardsSubtitle = null;
var listItems = null;
var navigationBtns = null;
var flkty = null;
var allData = [];
var completion = 0;
var AP_MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
var touchStartX = null;
var touchStartY = null;
var parser = new DOMParser();

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    BASE_URL = buildBaseURL();
    navigationBtns = document.querySelectorAll('.navigation .arrows');
    pymChild = new pym.Child({
        renderCallback: render
    });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('navigate-to-card', navigateToCard);
    pymChild.onMessage('scroll-to-category', scrollToCategory)
    navigationBtns.forEach(function(btn) {
        btn.addEventListener('click', onNavigationClick);
    })

    decideEmbedType();
}

var decideEmbedType = function() {
    if (getParameterByName('category')) {
        buildCategoryCards(getParameterByName('category'));
    } else {
        var ids = getParameterByName('ids').split(',');
        for (var i = 0; i < ids.length; i++) {
            var card = getCardData(ids, ids[i]);
        }

        cardsTitle = getParameterByName('title');
        cardsSubtitle = getParameterByName('subtitle');

        cardTimer = setInterval(function() {
            var defined = allData.filter(function(value) {
                return value !== undefined;
            }).length;

            if (defined === ids.length) {
                buildCards(allData);
            }
        }, 100);
    }
}

var buildCategoryCards = function(category) {
    var resourceLink = document.querySelector('.full-resource');
    if (resourceLink) {
        resourceLink.classList.add('hidden');
    }
    document.querySelector('body').classList.add('collapse');

    var request = new XMLHttpRequest();
    request.open('GET', BASE_URL + 'data/' + category + '.json', true);

    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText);
            data = data.sort(function(a, b) {
                if (a.title < b.title) {
                    return -1;
                } else if (a.title > b.title) {
                    return 1;
                } else {
                    return 0;
                }
            });

            document.querySelector('body').classList.add('category')
            document.querySelector('body').setAttribute('id', 'category-' + category);

            if (data.length > 1) {
                buildDropdown(data);
            }
            buildCards(data);

            pymChild.sendMessage('child-ready');
        } else {
            console.error('The request returned response ' + request.status);
        }
    };

    request.onerror = function() {
        console.error('There was an error with the request');
    };

    request.send();
}

var buildBaseURL = function() {
    if (document.location.hostname === 'apps.npr.org') {
        return 'https://apps.npr.org/cardbuilder/';
    } else {
        // for newer cards
        return 'https://apps.npr.org/cardbuilder/';

        // return 'https://s3.amazonaws.com/stage-apps.npr.org/cardbuilder/';
    }
}

var getCardData = function(ids, id) {
    var idIndex = ids.indexOf(id);

    var request = new XMLHttpRequest();
    request.open('GET', BASE_URL + 'data/' + id + '.json', true);

    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText);
            allData[idIndex] = data;
        } else {
            console.error('The request returned response ' + request.status);
        }
    };

    request.onerror = function() {
        console.error('There was an error with the request');
    };

    request.send();
}

var buildCards = function(data) {
    clearTimeout(cardTimer)

    buildSidebar(data, parser);
    for (var i = 0; i < data.length; i++) {
        buildCard(data[i], parser);
    }

    document.querySelector('.total').innerHTML = data.length;

    // Do not use flickity to stack vertically for printing
    // flkty = new Flickity('.cards', {
    //     cellSelector: '.card-main',
    //     draggable: isMobile,
    //     pageDots: false,
    //     setGallerySize: false,
    //     cellAlign: 'center',
    //     adaptiveHeight: true,
    //     prevNextButtons: false,
    //     friction: 1.5,
    //     selectedAttraction: 0.2,
    //     dragThreshold: 30
    // })
    // flkty.on('select', onFlickitySelect);

    cards = document.querySelectorAll('.card-main');

    for (var i = 0; i < cards.length; i++) {
        cards[i].addEventListener('click', onCardClick);
    }

    pymChild.sendHeight();

    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchmove', onTouchMove);
}

var buildDropdown = function(data) {
    var dropdown = document.querySelector('#dropdown').innerHTML;
    var dropdownTemplate = _.template(dropdown);
    var dropdownCompiled = parser.parseFromString(dropdownTemplate({
            cards: data
        }),
    'text/html').querySelector('.dropdown');

    document.querySelector('.card-wrapper').prepend(dropdownCompiled);

    document.querySelector('.dropdown').addEventListener('change', onDropdownSelect);
}

var buildSidebar = function(data, parser) {
    var cardSidebar = document.querySelector('#card-sidebar').innerHTML;
    var cardSidebarTemplate = _.template(cardSidebar);
    var cardSidebarCompiled = parser.parseFromString(cardSidebarTemplate({
            title: cardsTitle,
            subtitle: cardsSubtitle
        }),
    'text/html').querySelector('.card-sidebar');

    document.querySelector('.card-wrapper').prepend(cardSidebarCompiled);
}

var buildCard = function(data, parser) {
    if (data['image']) {
        data['image'] = BASE_URL + 'static/' + data['image'];
    }

    var categorySlug = classify(data['category']);
    var date = new Date(data['last_updated']);
    var dateStr = AP_MONTHS[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();

    data['last_updated'] = dateStr;
    data['category_slug'] = categorySlug;

    var cardMain = document.querySelector('#card-main').innerHTML;
    var cardMainTemplate = _.template(cardMain);
    var cardMainCompiled = parser.parseFromString(
        cardMainTemplate({
            item: data
        }),
    'text/html').querySelector('.card-main');

    document.querySelector('.cards').append(cardMainCompiled);
}

var onFlickitySelect = function() {
    var i = this.selectedIndex

    document.querySelector('.current').innerHTML = i + 1;

    if (i === 0) {
        document.querySelector('.arrow-prev').classList.add('disabled');
    } else {
        document.querySelector('.arrow-prev').classList.remove('disabled');
    }

    if (i === this.cells.length - 1) {
        document.querySelector('.arrow-next').classList.add('disabled')
    } else {
        document.querySelector('.arrow-next').classList.remove('disabled')
    }

    for (var j = 0; j < cards.length; j++) {
        if (j < i) {
            cards[j].classList.add('before');
            cards[j].classList.remove('after');
        } else if (j > i) {
            cards[j].classList.add('after');
            cards[j].classList.remove('before');
        } else {
            cards[j].classList.remove('before');
            cards[j].classList.remove('after');
        }
    }

    ANALYTICS.trackEvent('card-viewed', i.toString());
    trackCompletion(i, this.cells.length);
}

var onDropdownSelect = function(e) {
    flkty.select(e.target.selectedIndex);
}

var trackCompletion = function(index, length) {
    /*
    * Track completion based on slide index.
    */
    how_far = (index + 1) / (length);

    if (how_far >= completion + 0.25) {
        completion = how_far - (how_far % 0.25);

        if (completion === 0.25) {
            ANALYTICS.trackEvent('completion', '0.25');
        }
        else if (completion === 0.5) {
            ANALYTICS.trackEvent('completion', '0.5');
        }
        else if (completion === 0.75) {
            ANALYTICS.trackEvent('completion', '0.75');
        }
        else if (completion === 1) {
            ANALYTICS.trackEvent('completion', '1');

        }
    }
}

var onNavigationClick = function() {
    if (this.querySelector('.prev')) {
        flkty.previous();
        ANALYTICS.trackEvent('nav-used', 'prev');
    } else {
        flkty.next();
        ANALYTICS.trackEvent('nav-used', 'next');
    }
}

var onCardClick = function() {
    if (this.classList.contains('is-selected')) {
        return;
    }

    if ([].indexOf.call(cards, this) > flkty.selectedIndex) {
        flkty.next();
        ANALYTICS.trackEvent('card-nav-used', 'next');
    } else {
        flkty.previous();
        ANALYTICS.trackEvent('card-nav-used', 'prev');
    }

}

var onTouchStart = function(e) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY;
}

var onTouchMove = function(e) {
    var lastTouchX = e.changedTouches[0].clientX;
    var lastTouchY = e.changedTouches[0].clientY;
    var diffX = Math.abs(touchStartX - lastTouchX);
    var diffY = Math.abs(touchStartY - lastTouchY);

    if (diffY < 20 && diffX > 20) {
        e.preventDefault();
    } else {
        return true
    }
}

var scrollToCategory = function(category) {
    pymChild.scrollParentToChildEl('category-' + category);
}

var navigateToCard = function(card) {
    flkty.cells.forEach(function(cell) {
        var el = cell.element;
        if (el.getAttribute('data-slug') === card) {
            var index = flkty.cells.indexOf(cell);
            flkty.select(index);
        }
    });
}

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
