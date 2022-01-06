/*
  TODO:
  * Change quiz links to button elements
*/

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var $ = require("./lib/qsa");

// Global vars
var quiz = null;
var pymChild = null;
var resetButton = null;

// statuses
var numQuestions = null;

console.clear();

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
  quiz = document.querySelector("#quiz");
  resetButton = document.querySelector("button.reset");

  numQuestions = quiz.querySelectorAll(".question").length;
  var questions = quiz.querySelectorAll("li strong");
  questions.forEach((q, i) => {
    q.addEventListener("click", onAnswerClicked);
  });

  resetButton.addEventListener("click", onResetClicked);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
  });
}

/*
 * Quiz
 */
var onAnswerClicked = function(evt) {
  var thisAnswer = evt.target;
  var thisAnswerData = evt.target.parentNode.dataset;
  // console.log(thisAnswerData);
  var thisQuestion = evt.target.parentNode.parentNode.parentNode.parentNode;
  var thisQuestionNumber = Number(thisQuestion.parentNode.dataset.question);
  var allAnswers = thisQuestion.querySelectorAll("strong");

  var nextQuestion = thisAnswerData.next;

  // register that this question has been answered
  thisQuestion.classList.add("answered");
  allAnswers.forEach((a, i) => {
    a.removeEventListener("click", onAnswerClicked);
  });
  thisAnswer.parentNode.classList.add("selected");

  switch (nextQuestion) {
    case "END": // we're done
      // you could show an optional div of closing content if you want
      // results.classList.add("final");
      resetButton.classList.add("active");
      break;
    default: // all other questions with a next step
      // show the next question
      var nextQuestionSelector = `[data-question='${ nextQuestion }']`;
      var nextQuestion = document.querySelector(nextQuestionSelector);
      // console.log(nextQuestionSelector);
      nextQuestion.classList.add("active");

      resetButton.classList.add("active");
      break;
  }

  // update the iframe height
  if (pymChild) {
    pymChild.sendHeight();
  }
}

var onResetClicked = function() {
  [ "active", "answered", "final", "selected" ].forEach((a, i) => {
    var els = document.querySelectorAll("." + a);
    els.forEach((s, i) => {
      s.classList.remove(a);
    });
  });

  var questions = quiz.querySelectorAll("li strong");
  questions.forEach((q, i) => {
    q.addEventListener("click", onAnswerClicked);
  });

  // hide the reset button
  resetButton.classList.remove("active");

  // jump to the top of the div
  pymChild.scrollParentToChildEl("quiz");

  // update the iframe height
  if (pymChild) {
    pymChild.sendHeight();
  }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
