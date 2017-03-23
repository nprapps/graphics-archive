var searchInput = null;
var searchButton = null;
var resultsText = null;
var exampleQueries = null;
var table = null;
var rows = null;

var searchIndex = null;
var pymChild = null;
var toggleState = 'show';

var onWindowLoaded = function() {
    var tablesort = new Tablesort(document.getElementById('college-table'));
    // d3.selectAll('.hidden').remove()

    d3.select('.expand')
        .on('click', toggleSchools)

    pymChild = new pym.Child({});
    d3.selectAll('.hidden')
    .style('display', 'none');
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var toggleSchools = function() {
    // console.log(toggleState)
    if (toggleState == 'hidden') {
        d3.selectAll('.hidden')
        .style('display', 'none')
        if (pymChild) {
            pymChild.sendHeight();
        }
        d3.select('.expand')
            .html('<p>Show More Colleges</p>')
        toggleState = "show";
    } else {
        d3.selectAll('.hidden')
        .style('display', 'table-row')

        d3.select('.expand')
            .html('<p>Show Fewer Colleges</p>')


        if (pymChild) {
            pymChild.sendHeight();
        }
        toggleState = "hidden";
    }
}







/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
