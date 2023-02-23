var $ = require("./lib/qsa");
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var filters = $.one("#filters");
var filterStatus = $.one("#filterStatus");
var reviews = $("#reviews .review");
var pymChild = null;

var onWindowLoaded = function() {
  pym.then(child => {
    pymChild = child;

    // shuffle programs
    shufflePrograms("reviews", "review");

    filters.addEventListener("input", filterContent);

    // check filters from parent URL
    var parentUrl = new URL(pymChild.parentUrl, location, true);
    var params = new URLSearchParams(parentUrl.search);
    var presetGenre = params.get("genre");
    var presetNetwork = params.get("network");

    if (presetGenre) {
      var selector = $.one("#filters #genre_" + presetGenre);
      if (selector) {
        selector.click();
      }
    }

    if (presetNetwork) {
      var selector = $.one("#filters #network_" + presetNetwork);
      if (selector) {
        selector.click();
      }
    }

    updateFilterStatus();

    pymChild.sendHeight();
    window.addEventListener("resize", () => pymChild.sendHeight());
  });
}

// shuffle the programs
// via https://stackoverflow.com/questions/43979555/javascript-shuffle-divs-within-div
var shufflePrograms = function(c, el) {
  var container = document.getElementById(c);
  var elements = Array.prototype.slice.call(container.getElementsByClassName(el));
  elements.forEach(function(element){
    container.removeChild(element);
  });
  shuffleArray(elements);
  elements.forEach(function(element){
    container.appendChild(element);
  })
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

var filterContent = function(evt) {
  // console.log("clicked: " + evt.target.value);

  // handle all vs. singular toggles
  [ "genre", "network"].forEach((section, i) => {
    if (evt.target.value == (section + "_all") && evt.target.checked) {
      document.querySelectorAll("#filters ." + section + " input[type=checkbox]:checked").forEach((item, i) => {
        if (item.value != (section + "_all")) {
          item.checked = false;
        }
      });
    } else if (evt.target.value == (section + "_all") && !evt.target.checked) {
      // don't allow the "all filters to become unchecked if they're the only ones"
      document.querySelector("#filters #" + section + "_all").checked = true;
    } else if (evt.target.value.includes(section + "_")) {
      // untoggle "all" if you use a sub-filter
      document.querySelector("#filters #" + section + "_all").checked = false;
    }
  });

  // compile all the currently-selected filters
  var checkFilters = function(section) {
    return $(
      "#filters ." + section + " input[type=checkbox]:checked",
      filters
    ).map((el) => el.getAttribute("value"));
  }

  var genreFiltersChecked = checkFilters("genre");
  // if no filters are selected, go back to "all"
  if (genreFiltersChecked.length == 0) {
    document.querySelector("#filters #genre_all").checked = true;
    genreFiltersChecked = checkFilters("genre");
  }

  var networkFiltersChecked = checkFilters("network");
  // if no filters are selected, go back to "all"
  if (networkFiltersChecked.length == 0) {
    document.querySelector("#filters #network_all").checked = true;
    networkFiltersChecked = checkFilters("network");
  }
  // console.log(genreFiltersChecked, networkFiltersChecked);

  // show/hide reviews
  var matchingReviews = 0;
  reviews.forEach((review, i) => {
    var hasGenre = false;
    var hasNetwork = false;

    // match against genres
    // thank you: https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_intersection
    if (genreFiltersChecked.includes("genre_all")) {
      hasGenre = true;
    } else {
      var genreTest = [ genreFiltersChecked, [...review.classList] ];
      genreTest = genreTest.reduce(function(a,b) {
        return a.filter(function(value) {
          return b.includes(value);
        });
      });
      if (genreTest.length > 0) {
        hasGenre = true;
      }
    }

    // match against networks
    if (networkFiltersChecked.includes("network_all")) {
      hasNetwork = true;
    } else {
      var networkTest = [ networkFiltersChecked, [...review.classList] ];
      networkTest = networkTest.reduce(function(a,b) {
        return a.filter(function(value) {
          return b.includes(value);
        });
      });
      if (networkTest.length > 0) {
        hasNetwork = true;
      }
    }

    // if genre and network match, show it
    if (hasGenre && hasNetwork) {
      review.classList.remove("hidden");
      matchingReviews++;
    } else {
      review.classList.add("hidden");
    }
  });

  updateFilterStatus(matchingReviews);

  pymChild.sendHeight();
}

var updateFilterStatus = function() {
  var activeCount = $(".review:not(.hidden)").length;
  var statusMsg = "";
  switch(activeCount) {
    case 0:
      statusMsg = "No programs found.";
      break;
    case 1:
      statusMsg = "1 program found.";
      break;
    default:
      statusMsg = activeCount + " programs found.";
      break;
  }
  filterStatus.innerHTML = statusMsg;
}

// wait for images to load
window.onload = onWindowLoaded;
