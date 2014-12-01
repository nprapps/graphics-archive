var $graphic;

var bar_gap = 2;
var color;
var graphic_margin = 6;
var is_mobile = false;
var mobile_threshold = 480;
var num_x_ticks;
var pymChild = null;

var fmt_comma = d3.format(',');
var fmt_year_abbrev = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [
{'label':'New York','amt':14.4,'abbr':'N.Y.'},
{'label':'New Jersey','amt':12.9,'abbr':'N.J.'},
{'label':'District of Columbia','amt':11.5,'abbr':'D.C.'},
{'label':'Maryland','amt':11.2,'abbr':'Md.'},
{'label':'Connecticut','amt':11.1,'abbr':'Conn.'},
{'label':'Hawaii','amt':10.9,'abbr':'Hawaii'},
{'label':'Florida','amt':10.7,'abbr':'Fla.'},
{'label':'West Virginia','amt':10.6,'abbr':'W.Va.'},
{'label':'California','amt':10.4,'abbr':'Calif.'},
{'label':'Illinois','amt':10.4,'abbr':'Ill.'},
{'label':'Rhode Island','amt':10.4,'abbr':'R.I.'},
{'label':'Kentucky','amt':10.2,'abbr':'Ky.'},
{'label':'Mississippi','amt':10.2,'abbr':'Miss.'},
{'label':'Nevada','amt':9.9,'abbr':'Nev.'},
{'label':'Pennsylvania','amt':9.9,'abbr':'Pa.'},
{'label':'Michigan','amt':9.9,'abbr':'Mich.'},
{'label':'Delaware','amt':9.9,'abbr':'Del.'},
{'label':'Louisiana','amt':9.8,'abbr':'La.'},
{'label':'United States','amt':9.8,'abbr':'U.S.'},
{'label':'Virginia','amt':9.7,'abbr':'Va.'},
{'label':'South Carolina','amt':9.6,'abbr':'S.C.'},
{'label':'Massachusetts','amt':9.6,'abbr':'Mass.'},
{'label':'Tennessee','amt':9.5,'abbr':'Tenn.'},
{'label':'Alabama','amt':9.4,'abbr':'Ala.'},
{'label':'Texas','amt':9.4,'abbr':'Texas'},
{'label':'Arkansas','amt':9.4,'abbr':'Ark.'},
{'label':'Missouri','amt':9.1,'abbr':'Mo.'},
{'label':'Georgia','amt':9.1,'abbr':'Ga.'},
{'label':'North Carolina','amt':9,'abbr':'N.C.'},
{'label':'Ohio','amt':9,'abbr':'Ohio'},
{'label':'Oklahoma','amt':9,'abbr':'Okla.'},
{'label':'Indiana','amt':8.7,'abbr':'Ind.'},
{'label':'Arizona','amt':8.4,'abbr':'Ariz.'},
{'label':'Alaska','amt':8.2,'abbr':'Alaska'},
{'label':'Kansas','amt':8.1,'abbr':'Ks.'},
{'label':'New Mexico','amt':7.8,'abbr':'N.M.'},
{'label':'Maine','amt':7.7,'abbr':'Maine'},
{'label':'New Hampshire','amt':7.7,'abbr':'N.H.'},
{'label':'Nebraska','amt':7.6,'abbr':'Neb.'},
{'label':'South Dakota','amt':7.5,'abbr':'S.D.'},
{'label':'Wisconsin','amt':7.4,'abbr':'Wis.'},
{'label':'Iowa','amt':7.3,'abbr':'Iowa'},
{'label':'Washington','amt':7.1,'abbr':'Wash.'},
{'label':'Colorado','amt':7.1,'abbr':'Colo.'},
{'label':'Minnesota','amt':7.1,'abbr':'Minn.'},
{'label':'North Dakota','amt':7.1,'abbr':'N.D.'},
{'label':'Vermont','amt':7,'abbr':'Vt.'},
{'label':'Wyoming','amt':6.9,'abbr':'Wyo.'},
{'label':'Montana','amt':6.2,'abbr':'Mont.'},
{'label':'Oregon','amt':5.9,'abbr':'Ore.'},
{'label':'Idaho','amt':5.4,'abbr':'Idaho'},
{'label':'Utah','amt':5,'abbr':'Utah'}
];

/*
var graphic_data = [
{'label':'United States','amt':9.8,'abbr':'U.S.'},
{'label':'Alabama','amt':9.4,'abbr':'Ala.'},
{'label':'Alaska','amt':8.2,'abbr':'Alaska'},
{'label':'Arizona','amt':8.4,'abbr':'Ariz.'},
{'label':'Arkansas','amt':9.4,'abbr':'Ark.'},
{'label':'California','amt':10.4,'abbr':'Calif.'},
{'label':'Colorado','amt':7.1,'abbr':'Colo.'},
{'label':'Connecticut','amt':11.1,'abbr':'Conn.'},
{'label':'Delaware','amt':9.9,'abbr':'Del.'},
{'label':'District of Columbia','amt':11.5,'abbr':'D.C.'},
{'label':'Florida','amt':10.7,'abbr':'Fla.'},
{'label':'Georgia','amt':9.1,'abbr':'Ga.'},
{'label':'Hawaii','amt':10.9,'abbr':'Hawaii'},
{'label':'Idaho','amt':5.4,'abbr':'Idaho'},
{'label':'Illinois','amt':10.4,'abbr':'Ill.'},
{'label':'Indiana','amt':8.7,'abbr':'Ind.'},
{'label':'Iowa','amt':7.3,'abbr':'Iowa'},
{'label':'Kansas','amt':8.1,'abbr':'Ks.'},
{'label':'Kentucky','amt':10.2,'abbr':'Ky.'},
{'label':'Louisiana','amt':9.8,'abbr':'La.'},
{'label':'Maine','amt':7.7,'abbr':'Maine'},
{'label':'Maryland','amt':11.2,'abbr':'Md.'},
{'label':'Massachusetts','amt':9.6,'abbr':'Mass.'},
{'label':'Michigan','amt':9.9,'abbr':'Mich.'},
{'label':'Minnesota','amt':7.1,'abbr':'Minn.'},
{'label':'Mississippi','amt':10.2,'abbr':'Miss.'},
{'label':'Missouri','amt':9.1,'abbr':'Mo.'},
{'label':'Montana','amt':6.2,'abbr':'Mont.'},
{'label':'Nebraska','amt':7.6,'abbr':'Neb.'},
{'label':'Nevada','amt':9.9,'abbr':'Nev.'},
{'label':'New Hampshire','amt':7.7,'abbr':'N.H.'},
{'label':'New Jersey','amt':12.9,'abbr':'N.J.'},
{'label':'New Mexico','amt':7.8,'abbr':'N.M.'},
{'label':'New York','amt':14.4,'abbr':'N.Y.'},
{'label':'North Carolina','amt':9,'abbr':'N.C.'},
{'label':'North Dakota','amt':7.1,'abbr':'N.D.'},
{'label':'Ohio','amt':9,'abbr':'Ohio'},
{'label':'Oklahoma','amt':9,'abbr':'Okla.'},
{'label':'Oregon','amt':5.9,'abbr':'Ore.'},
{'label':'Pennsylvania','amt':9.9,'abbr':'Pa.'},
{'label':'Rhode Island','amt':10.4,'abbr':'R.I.'},
{'label':'South Carolina','amt':9.6,'abbr':'S.C.'},
{'label':'South Dakota','amt':7.5,'abbr':'S.D.'},
{'label':'Tennessee','amt':9.5,'abbr':'Tenn.'},
{'label':'Texas','amt':9.4,'abbr':'Texas'},
{'label':'Utah','amt':5,'abbr':'Utah'},
{'label':'Vermont','amt':7,'abbr':'Vt.'},
{'label':'Virginia','amt':9.7,'abbr':'Va.'},
{'label':'Washington','amt':7.1,'abbr':'Wash.'},
{'label':'West Virginia','amt':10.6,'abbr':'W.Va.'},
{'label':'Wisconsin','amt':7.4,'abbr':'Wis.'},
{'label':'Wyoming','amt':6.9,'abbr':'Wyo.'}
]; */



/*
 * Render the graphic
 */
function render(container_width) {
	var label_width;
	var bar_height;

    if (container_width <= mobile_threshold) {
    	is_mobile = true;
    	label_width = 40;
    	bar_height = 20;
    } else {
    	is_mobile = false;
    	label_width = 110;
    	bar_height = 25;
    }

    var margin = { top: 0, right: 15, bottom: 20, left: (label_width + 6) };
    var num_bars = graphic_data.length;
    var width = container_width - margin['left'] - margin['right'];
    var height = ((bar_height + bar_gap) * num_bars);
    
    // clear out existing graphics
    $graphic.empty();
    
    var graph = d3.select('#graphic');

    var x = d3.scale.linear()
        .domain([0, 15])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues([0,5,10,15]);
        
    var x_axis_grid = function() { 
        return xAxis;
    }

    var svg = graph.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
            .attr("y", function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr("width", function(d){ 
                return x(d['amt']);
            })
            .attr("height", bar_height)
            .attr('class', function(d, i) { 
                return 'bar-' + i + ' ' + classify(d['label']);
            });
    
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d) { 
                return x(d['amt']);
            })
            .attr('y', function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr('dx', -6)
            .attr('dy', (bar_height / 2) + 3)
            .attr('text-anchor', 'end')
            .attr('class', function(d) { 
                return classify(d['label']);
            })
            .text(function(d) { 
                return d['amt'].toFixed(1);
            });

    var labels = d3.select('#graphic').append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + label_width + 'px; top: 0; left: 0;')
        .selectAll('li')
            .data(graphic_data)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + label_width + 'px; ';
                s += 'height: ' + bar_height + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (bar_height + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                return classify(d['label']);
            })
            .append('span')
                .text(function(d) { 
                	if (is_mobile) {
						return d['abbr'];
					} else { 
						return d['label'];
					}
                });

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}


$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // setup pym
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})