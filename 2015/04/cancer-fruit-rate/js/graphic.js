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

		{"code":"al","ap":"Ala.","value":20.3},
		{"code":"ak","ap":"Alaska","value":30.5},
		{"code":"az","ap":"Ariz.","value":27.8},
		{"code":"ar","ap":"Ark.","value":22.4},
		{"code":"ca","ap":"Calif.","value":39.8},
		{"code":"co","ap":"Colo.","value":33.5},
		{"code":"ct","ap":"Conn.","value":34.4},
		{"code":"de","ap":"Del.","value":30.2},
		{"code":"dc","ap":"D.C.","value":35.2},
		{"code":"fl","ap":"Fla.","value":31.7},
		{"code":"ga","ap":"Ga.","value":26},
		{"code":"hi","ap":"Hawaii","value":29.1},
		{"code":"id","ap":"Idaho","value":30.6},
		{"code":"il","ap":"Ill.","value":34.5},
		{"code":"in","ap":"Ind.","value":27.2},
		{"code":"ia","ap":"Iowa","value":27.5},
		{"code":"ks","ap":"Kan.","value":24.2},
		{"code":"ky","ap":"Ky.","value":22.8},
		{"code":"la","ap":"La.","value":20.9},
		{"code":"me","ap":"Maine","value":34.3},
		{"code":"md","ap":"Md.","value":30.9},
		{"code":"ma","ap":"Mass.","value":33.8},
		{"code":"mi","ap":"Mich.","value":30.1},
		{"code":"mn","ap":"Minn.","value":30.2},
		{"code":"ms","ap":"Miss.","value":21.7},
		{"code":"mo","ap":"Mo.","value":25.2},
		{"code":"mt","ap":"Mont.","value":28.9},
		{"code":"ne","ap":"Neb.","value":29.8},
		{"code":"nv","ap":"Nev.","value":30.7},
		{"code":"nh","ap":"N.H.","value":32.7},
		{"code":"nj","ap":"N.J.","value":31.3},
		{"code":"nm","ap":"N.M.","value":28.3},
		{"code":"ny","ap":"N.Y.","value":34.1},
		{"code":"nc","ap":"N.C.","value":23.6},
		{"code":"nd","ap":"N.D.","value":28.1},
		{"code":"oh","ap":"Ohio","value":26.4},
		{"code":"ok","ap":"Okla.","value":19},
		{"code":"or","ap":"Ore.","value":34.6},
		{"code":"pa","ap":"Pa.","value":30.1},
		{"code":"ri","ap":"R.I.","value":32.9},
		{"code":"sc","ap":"S.C.","value":25.5},
		{"code":"sd","ap":"S.D.","value":26.4},
		{"code":"tn","ap":"Tenn.","value":17.6},
		{"code":"tx","ap":"Texas","value":23.5},
		{"code":"ut","ap":"Utah","value":33.4},
		{"code":"vt","ap":"Vt.","value":34.7},
		{"code":"va","ap":"Va.","value":31.3},
		{"code":"wa","ap":"Wash.","value":28.3},
		{"code":"wv","ap":"W.Va.","value":19},
		{"code":"wi","ap":"Wis.","value":31},
		{"code":"wy","ap":"Wyo.","value":27.3

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

			tooltip: {
		    	useHTML: true,
	     		style : {
					opacity: 1,
		 			fontFamily: "arial, helvetica, sans-serif"
		 	   		},
				borderWidth: 0,
				borderColor: '#ffffff',
				borderRadius: 0,
	             formatter: function(){
	                 var s = 'Twice-daily fruit consumption rate in <b>' + this.point.ap + '</b>: ' + this.point.value + '%';
	                 return s;
	             },

	         },

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
	                text: '<strong>Twice-Daily Fruit Consumption Rate</strong><br />Darker shades represent lower consumption rates.',
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
	                to: 21,
	                color: "#6C2315"
	            }, {
	                from: 21.01,
	                to: 25,
	                color: "#A23520"
	            }, {
	                from: 25.01,
	                to: 30,
	                color: "#D8472B"
	            }, {
	                from: 30.01,
	                to: 32,
	                color: "#E27560"
	            }, {
	                from: 32.01,
	                color: "#ECA395"
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
