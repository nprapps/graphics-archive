var pym = require('./lib/pym');
var ANALYTICS = require('./lib/analytics');
require('./lib/webfonts');
var { isMobile } = require('./lib/breakpoints');

var d3 = {
  ...require('d3-array/dist/d3-array.min'),
  ...require('d3-axis/dist/d3-axis.min'),
  ...require('d3-scale/dist/d3-scale.min'),
  ...require('d3-selection/dist/d3-selection.min'),
  ...require('d3-transition/dist/d3-transition.min'),
};

var pymChild = null;
var selectedState = null;

var selectedQuestions = new Set();

console.clear();

//Initialize graphic
var onWindowLoaded = function () {
  render();

  window.addEventListener('resize', function () {
    if (pymChild) {
      pymChild.sendHeight();
    }
  });

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function () {
  // Get necessary data.
  var stateInformation = getData();
  var questions = [];
  for (question of QUESTIONS) {
    questions.push({ id: question['id'].toString(), question: question['Question']});
  }

  // Clear container.
  var container = d3.select('#graphic-container');
  container.html('');

  // Append necessary children.
  container.append('div').attr('id', 'questions-container');
  container
    .append('div')
    .attr('id', 'bills-container')
    .attr('class', 'section-hidden');
  container
    .append('div')
    .attr('id', 'button-container')
    .append('div')
    .attr('class', 'button-div');

  // Get data and render graphic.
  renderWalkthrough(stateInformation, questions);
};

// Get the data from the sheet.
function getData() {
  var stateInformation = {};
  for (state in BENEFITS) {
    var cleanState = BENEFITS[state]['state'].replace(/\s+$|\"/g, '');
    if (!cleanState) {
      continue;
    }
    if (!stateInformation[cleanState]) {
      stateInformation[cleanState] = {};
      stateInformation[cleanState]['ids'] = new Set();
      stateInformation[cleanState]['bills'] = [];
    }
    var qIds = String(BENEFITS[state]['eligible_question'])
      .split('|')
      .forEach(item =>
        stateInformation[cleanState]['ids'].add(item.replace(/ /g, ''))
      );

    var billIds = String(BENEFITS[state]['eligible_question']).split('|');
    billIds.forEach((item, i) => (billIds[i] = item.replace(/ /g, '')));
    stateInformation[cleanState]['bills'].push({
      ids: billIds,
      text: BENEFITS[state]['benefit_text'],
      link: BENEFITS[state]['link'],
    });
  }
  return stateInformation;
}

// Initial rendering of walkthrough experience.
function renderWalkthrough(stateInformation, questions) {
  // Render dropdown with list of states.
  var stateMenu = d3.select('#dropdown');
  stateMenu
    .selectAll('option.state-option')
    .data(Object.keys(stateInformation).sort())
    .enter()
    .append('option')
    .attr('class', 'state-option')
    .text(d => d)
    .attr('value', d => d)
    .property('selected', function (d) {
      return d === 'Alabama';
    });

  updateState(stateInformation, questions);

  stateMenu.on('change', d => updateState(stateInformation, questions));

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

// Handles different state selection in dropdown.
function updateState(stateInformation, questions) {
  var state = document.getElementById('dropdown').value;

  // If we're already on selected state, do nothing.
  if (selectedState == state) {
    return;
  }
  selectedState = state;


  var selectedOptions = updateQuestions(state, stateInformation, questions, selectedOptions);
  updateBills(state, stateInformation);

  showQuestionDisplay(state, stateInformation, selectedOptions);

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

// Updates the text displayed on the navigation button.
// Change the function it applies.
function updateButton(onclickFxn, text, opt_class) {
  // Clear button content.
  var buttonDiv = d3.select('.button-div');
  buttonDiv.html('');

  buttonDiv
    .append('button')
    .attr('id', 'transition-button')
    .text(text)
    .attr('class', opt_class)
    .on('click', onclickFxn);

  if (text == 'See Benefits') {
    buttonDiv.append('div').attr('id', 'bills-apply');
  }
}

// Hide the questions and displays the bills.
function showBillDisplay(state, stateInformation, selectedOptions) {
  // d3.select('#dropdown').attr('class', 'section-hidden');
  d3.select('#questions-container').attr('class', 'section-hidden');
  d3.select('#bills-container').attr('class', '');

  updateButton(
    d => showQuestionDisplay(state, stateInformation, selectedOptions),
    'back to questions'
  );

  resizeAndScrollToTop();
}

// Show the questions, hide the bills.
function showQuestionDisplay(state, stateInformation, selectedOptions) {
  d3.select('#bills-container').attr('class', 'section-hidden');
  d3.select('#dropdown').attr('class', 'state-dropdown');
  d3.select('#questions-container').attr('class', '');

  updateButton(
    d => showBillDisplay(state, stateInformation, selectedOptions),
    'See Benefits'
  );

  previewBillsSelected(state, selectedOptions, stateInformation);

  resizeAndScrollToTop();
}

// Updates the list of questions displayed to user.
function updateQuestions(state, stateInformation, questions, selectedOptions) {
  var questionsContainer = d3.select('#questions-container');
  questionsContainer.html('');

  // If state hasn't changed, return.
  if (!state) {
    return;
  }

  questionsContainer.append('h2').text('Questions').attr('class', 'subheader');

  // Get relevant questions
  var questionIds = Array.from(stateInformation[state]['ids']);
  currQuestions = questions.filter(x => questionIds.includes(x.id));

  // Keep track of what questions have been checked.
  selectedOptions = new Set();

  questionsContainer
    .selectAll('div')
    .data(currQuestions)
    .enter()
    .append('div')
    .attr('class', 'input-div')
    .append('label')
    .attr('class', 'checkbox-label')
    .attr('for', function (d, i) {
      return 'a' + i;
    })
    .text(function (d) {
      return d['question'];
    })
    .append('input')
    .property('checked', false)
    .attr('class', 'checkbox-hidden')
    .attr('type', 'checkbox')
    .attr('id', function (d, i) {
      return 'a' + i;
    })
    .on('click', d =>
      onQuestionSelected(d, state, selectedOptions, stateInformation)
    );

  questionsContainer
    .selectAll('label')
    .append('span')
    .attr('class', 'custom-checkbox');

  // Update button to show benefits.
    updateButton(
      d => showBillDisplay(state, stateInformation, selectedOptions),
      'See Benefits'
    );

    return selectedOptions;
}

// Update the displayed bills, setting those whose corresponding checkmarks
// are selected to active.
function updateBills(state, stateInformation, selectedOptions) {
  var billsContainer = d3.select('#bills-container');
  billsContainer.html('');

  // Return if there is no active state.
  if (!state) {
    return;
  }

  // Get bills for state and create text displays for each.
  var bills = stateInformation[state]['bills'];

  var activeBills = bills.filter(d =>
    questionsSelected(d['ids'], selectedOptions)
  );
  var inactiveBills = bills.filter(
    d => !questionsSelected(d['ids'], selectedOptions)
  );

  // Display active and inactive bills separately.
  if (activeBills.length > 0) {
    var activeBillsContainer = billsContainer.append('div').attr('class', 'active-bills');
    activeBillsContainer
      .append('h2')
      .text('Benefits That May Apply To You')
      .attr('class', 'subheader');
    displayBills(activeBillsContainer, activeBills, selectedOptions);
  }

  if (activeBills.length != bills.length) {
    var inactiveBillsContainer = billsContainer.append('div').attr('class', 'inactive-bills');
    inactiveBillsContainer
      .append('h2')
      .text(activeBills.length ?  'Other State Benefits' : 'State Benefits')
      .attr('class', 'subheader');

    displayBills(inactiveBillsContainer, inactiveBills, selectedOptions);
  }
}

// Create display for list of bills.
function displayBills(billsContainer, filteredData, selectedOptions) {
  billsContainer
    .selectAll('div')
    .data(filteredData)
    .enter()
    .append('div')
    .attr('class', function (d) {
      var text = 'bill-text ';
      if (questionsSelected(d['ids'], selectedOptions)) {
        text += 'active';
      }
      return text;
    })
    .text(function (d) {
      var text = d['text'].trim();
      if (!text.endsWith('.')) {
        text = text.concat('.');
      }
      return text;
    })
    .append('a')
    .property('href', function (d) {
      return d['link'];
    })
    .text(' (Read more)');
}

// Handles a question being checked.
function onQuestionSelected(d, state, selectedOptions, stateInformation) {
  // If question already selected, remove. Else, add.
  if (selectedOptions.has(d['id'])) {
    selectedOptions.delete(d['id']);
  } else {
    selectedOptions.add(d['id']);
  }

  previewBillsSelected(state, selectedOptions, stateInformation);
  updateBills(state, stateInformation, selectedOptions);
}

// Update the preview selected bills text.
function previewBillsSelected(state, selectedOptions, stateInformation) {
  var bills = stateInformation[state]['bills'];
  var count = numBillsSelected(selectedOptions, bills);

  var billsText = count == 0 ? '' : `${count} benefit${isPlural(count)} may apply to you`;
  d3.select('#bills-apply').text(billsText).attr('aria-live', "polite");
}

// Helper function to get the number of bills that the selected questions
// correspond to. 
function numBillsSelected(selectedOptions, bills) {
  var count = 0; 
  bills.forEach(function(x) {
    if (questionsSelected(x['ids'], selectedOptions)) {
      count += 1;
    }
  });
  return count;
}

// Helper function to return whether a list of questions have been selected.
function questionsSelected(questions, selectedOptions) {
  return selectedOptions && questions.some(e => selectedOptions.has(e));
}

// Resizes graphic and scrolls to top on size change.
function resizeAndScrollToTop() {
  if (pymChild) {
    pymChild.sendHeight();
    pymChild.scrollParentToChildEl('dropdown-id');
  }
}

var isPlural = function (d) {
  if (d == 1) {
    return '';
  } else {
    return 's';
  }
};

//first render
window.onload = onWindowLoaded;
