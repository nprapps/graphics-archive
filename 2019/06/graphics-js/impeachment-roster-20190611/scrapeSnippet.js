// run on: https://cookpolitical.com/ratings/house-race-ratings

console.clear();

var modals = document.querySelectorAll(".solid-seats-modal");
var ratings = [].concat(...Array.from(modals).map(function(m) {
    var rating = m.querySelector(".solid-seats-modal-in-title").innerHTML;
    var rows = m.querySelectorAll(".popup-table-data-row");
    rows = Array.from(rows).slice(1);
    return Array.from(rows).map(function(row) {
        var [race, name, lean] = Array.from(row.querySelectorAll(".popup-table-data-cell"))
            .map(c => c.innerHTML.trim());
        var [state, district] = race.split("-");
        return [ state, district, name, lean, rating ];
    });
}));

copy("state,district,name,lean,rating\n" + ratings.map(r => r.join()).join("\n"));