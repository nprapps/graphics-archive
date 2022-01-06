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
var results = null;
var pymChild = null;

var numQuestions = 0;
var numTaken = 0;
var numCorrect = 0;
var numRemaining = 0;
var promptsRight = [];
var promptsWrong = [];

console.clear();

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
  quiz = document.querySelector("#quiz");
  results = document.querySelector("#results");

  numQuestions = quiz.querySelectorAll(".question").length;
  var questions = quiz.querySelectorAll("li strong");
  questions.forEach((q, i) => {
    q.addEventListener("click", onAnswerClicked);
  });

  promptsRight = PROMPTS.filter(d => d.type == "right");
  // promptsWrong = PROMPTS.filter(d => d.type == "wrong");

  // array of prompts
  for (var i = 1; i <= numQuestions; i++) {
    promptsWrong[i] = PROMPTS.filter(d => d.type == "wrong");
  }

  // social share toggle
  if ("share" in navigator) {
    document.body.classList.add("navigator-share-supported");

    $.one(".navigator-share").addEventListener("click", function() {
      var shared = navigator.share({
        text: PROJECT_TEXT,
        url: PROJECT_LINK
      });

      ANALYTICS.trackEvent("clicked-social", "navigator");
    });
  } else {
    var socialLinks = document.querySelectorAll(".social-link");
    socialLinks.forEach((link, i) => {
      link.addEventListener("click", onSocialLinkClicked);
    });
  }

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
  });
}

var onSocialLinkClicked = function(evt) {
  ANALYTICS.trackEvent(evt.target.dataset.track, evt.target.dataset.label);
}


/*
 * Quiz
 */
var onAnswerClicked = function(evt) {
  var thisAnswer = evt.target;
  var thisQuestion = evt.target.parentNode.parentNode.parentNode.parentNode;
  var thisQuestionNumber = Number(thisQuestion.parentNode.dataset.question);
  var allAnswers = thisQuestion.querySelectorAll("strong");

  // check if the user selected the correct answer
  var gotItRight = thisAnswer.parentNode.classList.contains("correct");

  if (gotItRight) {
    // register that this question has been answered
    thisQuestion.classList.add("answered");
    numTaken++;
    numRemaining = numQuestions - numTaken;
    allAnswers.forEach((a, i) => {
      a.removeEventListener("click", onAnswerClicked);
    });

    // tell the user if they got it right
    var answerLabel = document.createElement("b");
    answerLabel.textContent = promptsRight[Math.floor(Math.random() * promptsRight.length)].message;
    numCorrect++;
    thisAnswer.prepend(answerLabel);
    thisAnswer.parentNode.classList.add("selected");

    // if all questions have been answered, show a rewarding message
    if (numTaken == numQuestions) {
      results.classList.add("final");
      printDiploma();
      ANALYTICS.trackEvent("questions-answered", "8");
    } else {
      results.classList.add("active");
      var resultsMsgCounter = results.querySelector("#answered-count");
      resultsMsgCounter.innerHTML = numTaken;

      // show the next question
      var nextQuestionSelector = `[data-question='${ (thisQuestionNumber + 1) }']`;
      var nextQuestion = document.querySelector(nextQuestionSelector);
      nextQuestion.classList.add("active");

      ANALYTICS.trackEvent("questions-answered", numTaken);
    }
  } else {
    // prompt user to try again
    var answerLabel = document.createElement("b");
    var randomIdx = Math.floor(Math.random() * promptsWrong[thisQuestionNumber].length)
    var thisPromptWrong = promptsWrong[thisQuestionNumber][randomIdx].message;
    // only allow this prompt to be used once for this question
    promptsWrong[thisQuestionNumber].splice(randomIdx,1);

    answerLabel.textContent = thisPromptWrong;
    thisAnswer.prepend(answerLabel);
    thisAnswer.parentNode.classList.add("selected");
  }

  // update the iframe height
  if (pymChild) {
    pymChild.sendHeight();
  }
}


/*
 * Diploma
 */
var background = new Promise(ok => {
  var image = new Image();
  image.src = "./diploma-blank.jpg";
  image.onload = () => ok(image);
});

// this is a percentage, not pixels
var textBaseline = {
  x: .5,
  y: .35,
  max: .9
}

var graduateButton = $.one("button.graduate");
var saveButton = $.one(".diploma .save");
var nameInput = $.one(".diploma-inputs .name");
var diplomaContainer = $.one(".diploma");
var canvas = $.one(".diploma canvas");
var context = canvas.getContext("2d");

var printDiploma = async function() {
  var image = await background;
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);
  var name = nameInput.value;
  if (name == "") {
    name = DIPLOMA_DEFAULT_NAME;
  }
  var fontSize = canvas.height * .1;
  context.font = `${fontSize}px Gotham`;
  var metrics = context.measureText(name);

  // figure out how to make it fit
  var maxWidth = textBaseline.max * canvas.width;
  if (metrics.width > maxWidth) {
    var ratio = metrics.width / maxWidth;
    fontSize /= ratio;
    context.font = `${fontSize}px Gotham`;
  }
  var width = Math.min(metrics.width, maxWidth);

  var top = textBaseline.y * canvas.height;
  var left = textBaseline.x * canvas.width - (width / 2);

  context.fillText(name, left, top);

  diplomaContainer.classList.add("reveal");

  ANALYTICS.trackEvent("diploma-rendered");
}

graduateButton.addEventListener("click", printDiploma);

saveButton.addEventListener("click", function() {
  var link = document.createElement("a");
  link.href = canvas.toDataURL();
  var today = new Date();
  link.download = `diploma-${Date.now()}`;
  link.click();

  ANALYTICS.trackEvent("diploma-saved");
});

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
