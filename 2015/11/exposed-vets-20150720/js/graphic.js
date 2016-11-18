var $searchInput = null;
var $searchButton = null;
var $resultsText = null;
var $exampleQueries = null;
var $table = null;
var $rows = null;

var searchIndex = null;
var pymChild = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    $searchInput = $('#search input');
    $searchButton = $('#search button');
    $resultsText = $('#results-text');
    $exampleQueries = $('#search p a')
    $table = $('table');
    $rows = $('tbody tr');

    setupSearchIndex();
    onSearchInputKeyup();

    $searchInput.on('keyup', _.throttle(onSearchInputKeyup, 500));
    $exampleQueries.on('click', onExampleQueryClick);

    pymChild = new pym.Child({});
}

/*
 * Create the search index and add all data.
 */
var setupSearchIndex = function() {
    searchIndex = new lunr.Index();

    searchIndex.field('name', { boost: 10 });
    searchIndex.field('city', { boost: 5 });
    searchIndex.field('state');
    searchIndex.field('branch');
    searchIndex.field('yob');
    searchIndex.field('yod');
    searchIndex.field('enlist_year');
    searchIndex.ref('id');

    $rows.each(function(i, row) {
        var $row = $(row);
        var vet = {};

        vet['id'] = $row.attr('id');
        vet['name'] = $row.children('.name').text();

        var city = $row.children('.location').data('city');

        if (city) {
            vet['city'] = city;
        }

        var state = $row.children('.location').data('state');

        if (state) {
            vet['state'] = state;
        }

        var branch = $row.children('.branch').text();

        if (branch) {
            vet['branch'] = branch;
        }

        var dob = $row.children('.dob').text();

        if (dob) {
            vet['yob'] = dob.slice(-4);
        }

        var dod = $row.children('.dod').text();

        if (dod) {
            vet['yod'] = dod.slice(-4);
        }

        var enlist_date = $row.children('.enlist').text();

        if (enlist_date) {
            vet['enlist_year'] = enlist_date.slice(-4);
        }

        searchIndex.add(vet);
    });
}

/*
 * Initiate a new search.
 */
var onSearchInputKeyup = function() {
    var query = $searchInput.val();

    $rows.css('display', 'none');
    $table.css('display', 'none');

    if (query.length == 0) {
        $resultsText.html(LABELS['no_query']);
    } else if (query.length < 3) {
        $resultsText.html(LABELS['too_short']);
    } else {
        var result = searchIndex.search(query);

        if (result.length == 0) {
            $resultsText.html(LABELS['none_found']);
        } else if (result.length == 1) {
            $resultsText.html('Showing <strong>1</strong> veteran that matches your query.');
        } else {
            $resultsText.html('Showing <strong>' + result.length + '</strong> veterans that match your query.');
        }

        if (result.length > 0) {
            $table.css('display', 'table');

            for (var i = 0; i < result.length; i++) {
                $('#' + result[i]['ref']).css('display', 'table-row');
            }
        }
    }

    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Initiate a sample search.
 */
var onExampleQueryClick = function() {
    var query = $(this).text();

    $searchInput.val(query);

    onSearchInputKeyup();
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
