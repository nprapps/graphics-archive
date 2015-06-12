var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

/*
 * Render the graphic
 */
function render(width) {
    // TODO: draw your graphic

    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    pymChild = new pym.Child({
        renderCallback: render
    });
});

$(function () {

    var data = [

		{"code":"al","ap":"Ala.","value":31.5},
		{"code":"ak","ap":"Alaska","value":22.3},
		{"code":"az","ap":"Ariz.","value":25.2},
		{"code":"ar","ap":"Ark.","value":34.4},
		{"code":"ca","ap":"Calif.","value":21.4},
		{"code":"co","ap":"Colo.","value":17.9},
		{"code":"ct","ap":"Conn.","value":24.9},
		{"code":"de","ap":"Del.","value":27.8},
		{"code":"dc","ap":"D.C.","value":19.5},
		{"code":"fl","ap":"Fla.","value":27.7},
		{"code":"ga","ap":"Ga.","value":27.2},
		{"code":"hi","ap":"Hawaii","value":22.1},
		{"code":"id","ap":"Idaho","value":23.7},
		{"code":"il","ap":"Ill.","value":25.1},
		{"code":"in","ap":"Ind.","value":31.1},
		{"code":"ia","ap":"Iowa","value":28.5},
		{"code":"ks","ap":"Kan.","value":26.5},
		{"code":"ky","ap":"Ky.","value":30.2},
		{"code":"la","ap":"La.","value":32.2},
		{"code":"me","ap":"Maine","value":23.3},
		{"code":"md","ap":"Md.","value":25.3},
		{"code":"ma","ap":"Mass.","value":23.5},
		{"code":"mi","ap":"Mich.","value":24.4},
		{"code":"mn","ap":"Minn.","value":23.5},
		{"code":"ms","ap":"Miss.","value":38.1},
		{"code":"mo","ap":"Mo.","value":28.3},
		{"code":"mt","ap":"Mont.","value":22.5},
		{"code":"ne","ap":"Neb.","value":25.3},
		{"code":"nv","ap":"Nev.","value":23.7},
		{"code":"nh","ap":"N.H.","value":22.4},
		{"code":"nj","ap":"N.J.","value":26.8},
		{"code":"nm","ap":"N.M.","value":24.3},
		{"code":"ny","ap":"N.Y.","value":26.7},
		{"code":"nc","ap":"N.C.","value":26.6},
		{"code":"nd","ap":"N.D.","value":27.6},
		{"code":"oh","ap":"Ohio","value":28.5},
		{"code":"ok","ap":"Okla.","value":33},
		{"code":"or","ap":"Ore.","value":18.6},
		{"code":"pa","ap":"Pa.","value":26.3},
		{"code":"ri","ap":"R.I.","value":26.9},
		{"code":"sc","ap":"S.C.","value":26.9},
		{"code":"sd","ap":"S.D.","value":23.9},
		{"code":"tn","ap":"Tenn.","value":37.2},
		{"code":"tx","ap":"Texas","value":30.1},
		{"code":"ut","ap":"Utah","value":20.6},
		{"code":"vt","ap":"Vt.","value":20.5},
		{"code":"va","ap":"Va.","value":25.5},
		{"code":"wa","ap":"Wash.","value":20},
		{"code":"wv","ap":"W.Va.","value":31.4},
		{"code":"wi","ap":"Wis.","value":23.8},
		{"code":"wy","ap":"Wyo.","value":25.1

	}];

		//AP styles for state names
		var processed_json = new Array();
		$.map(data, function (obj, i) {
		    processed_json.push({ name: obj.code, y: parseInt(obj.value), customName : obj.ap });
		});

		//uppercase postal codes to join to geojson
		$.each(data, function () {
            this.code = this.code.toUpperCase();
        });

        // Instanciate the map
        $('#container').highcharts('Map', {

            chart : {
                borderWidth : 0
            },

            title : {
                text : ''
            },

			legend: {
				enabled: true,
				useHTML: true,
				style: {
	                fontFamily: 'arial, helvetica, sans-serif'
	            }
	        },

			credits: {
				enabled: false
			},

			exporting: {
				enabled: false
			},

			mapNavigation: {
	            enabled: false,
				enableMouseWheelZoom: false,
			},

			legend: {
				itemStyle: {
	                color: '#000000',
	                fontWeight: 'normal',
					fontSize: 11,
	                fontFamily: 'arial, helvetica, sans-serif',
					paddingBottom: 0,
					paddingRight: 2,
					backgroundColor: '#ffffff',
					borderColor: '#ffffff'
	            },

	            title: {
	                text: '<strong>Low Exercise Rate</strong><br />Darker shades represent lower exercise rates.',
					style: {
                        fontWeight: 'default',
		                fontFamily: 'arial, helvetica, sans-serif'
		            }
	            },
			    layout: 'horizontal',
	            align: 'center',
				verticalAlign: 'top',
	            floating: false,
	            valueDecimals: 0,
				valueSuffix: '%',
	            symbolRadius: 0,
	            symbolHeight: 10,
				symbolWidth: 20
	        },

            colorAxis: {
				dataClasses: [{
	                from: 0,
	                to: 22,
	                color: "#F1C696"
	            }, {
	                from: 22.01,
	                to: 25,
	                color: "#EAAA61"
	            }, {
	                from: 25.01,
	                to: 28,
	                color: "#E38D2C"
	            }, {
	                from: 28.01,
	                to: 33,
	                color: "#AA6A21"
	            }, {
	                from: 33.01,
	                color: "#714616"
	            }]
	        },


			plotOptions: {
			    series: {
			        animation: false,
                    enableMouseTracking: false
			    }
			},

            series : [{
				borderWidth: 0.4,
				borderColor: 'white',
                data : data,
                mapData: Highcharts.geojson(Highcharts.maps['countries/us/us-all']),
                joinBy: ['postal-code', 'code']
	        }]
	    });
	});
