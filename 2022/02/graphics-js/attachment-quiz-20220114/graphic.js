var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var $ = require("./lib/qsa");

// Global vars
var quiz = null;
var pymChild = null;

let slides;
let currentSlide;
let questionSlides;

let counts = null;

console.clear();

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
  // Setup handlers
  document.querySelectorAll("button.reset").forEach(button => {
    button.addEventListener("click", resetQuiz)
  })
  document.querySelectorAll("button.start").forEach(button => {
    button.addEventListener("click", goForward)
  })
  slides = document.querySelectorAll(".slide");
  questionSlides = document.querySelectorAll(".slide--question");
  questionSlides.forEach((question, idx) => {
    question.querySelectorAll("button.answer").forEach(answer => {
      answer.addEventListener("click", () => {
        answer.dataset.checked = '1';
        goForward();
      })
    })
  })
  resetQuiz();
}

function resetQuiz() {
  currentSlide = 0;

  counts = {}
  CATEGORIES.forEach(category => {
    counts[category.attachment_style] = {
      ...category,
      count: 0,
      total: 0
    }
  })

  questionSlides.forEach((question, idx) => {
    question.querySelectorAll('.answer').forEach(answer => {
      answer.dataset.checked = '0';
    }) 
    counts[question.dataset.category].total += 1
  })

  updateCurrentSlideDisplay();
  updateScoreDisplay();
}

function goForward() {
  if (currentSlide < (slides.length - 1)) {
    currentSlide += 1;
    updateCurrentSlideDisplay();
  }

  if (currentSlide === (slides.length - 1)) {
    tallyScore();
    updateScoreDisplay();
    return;
  }
}

function updateCurrentSlideDisplay() {
  slides.forEach((slide, idx) => {
    if (idx === currentSlide) {
      slide.classList.add("current")
    } else {
      slide.classList.remove("current")
    }
  })
}

function updateScoreDisplay() {
  let resultEls = document.querySelectorAll('.result')
  resultEls.forEach((result, idx) => {
    let data = counts[result.dataset.result];
    let percentage = Math.round((data.count / data.total) * 100);
    result.querySelector('.result--bar-fill').style.width = `${percentage}%`
    result.querySelector('.result--score').innerHTML = `${percentage}%`
    let labelEl = result.querySelector('.result--name')
    let scoreEl = result.querySelector('.result--score')
    let barWidth = result.querySelector('.result--bar-container').clientWidth
    scoreEl.style.left = 'auto';
    if (percentage == 100) {
      scoreEl.style.left = `calc(${percentage}% - ${scoreEl.clientWidth}px)`
    } else if (((data.count / data.total) * barWidth) > (labelEl.clientWidth + scoreEl.clientWidth)) {
      scoreEl.style.left = `calc(${percentage}% - ${scoreEl.clientWidth / 2}px)`
    }
  })
}

function tallyScore() {
  questionSlides.forEach((question, idx) => {
    question.querySelectorAll('.answer').forEach(answer => {
      if (answer.value === 'agree' && answer.dataset.checked == '1') {
        counts[question.dataset.category].count += 1
      }
    }) 
  })
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;