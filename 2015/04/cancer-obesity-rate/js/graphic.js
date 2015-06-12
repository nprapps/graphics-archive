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

		{"code":"al","ap":"Ala.","value":32.4},
		{"code":"ak","ap":"Alaska","value":28.4},
		{"code":"az","ap":"Ariz.","value":26.8},
		{"code":"ar","ap":"Ark.","value":34.6},
		{"code":"ca","ap":"Calif.","value":24.1},
		{"code":"co","ap":"Colo.","value":21.3},
		{"code":"ct","ap":"Conn.","value":25},
		{"code":"de","ap":"Del.","value":31.1},
		{"code":"dc","ap":"D.C.","value":22.9},
		{"code":"fl","ap":"Fla.","value":26.4},
		{"code":"ga","ap":"Ga.","value":30.3},
		{"code":"hi","ap":"Hawaii","value":21.8},
		{"code":"id","ap":"Idaho","value":29.6},
		{"code":"il","ap":"Ill.","value":29.4},
		{"code":"in","ap":"Ind.","value":31.8},
		{"code":"ia","ap":"Iowa","value":31.3},
		{"code":"ks","ap":"Kan.","value":30},
		{"code":"ky","ap":"Ky.","value":33.2},
		{"code":"la","ap":"La.","value":33.1},
		{"code":"me","ap":"Maine","value":28.9},
		{"code":"md","ap":"Md.","value":28.3},
		{"code":"ma","ap":"Mass.","value":23.6},
		{"code":"mi","ap":"Mich.","value":31.5},
		{"code":"mn","ap":"Minn.","value":25.5},
		{"code":"ms","ap":"Miss.","value":35.1},
		{"code":"mo","ap":"Mo.","value":30.4},
		{"code":"mt","ap":"Mont.","value":24.6},
		{"code":"ne","ap":"Neb.","value":29.6},
		{"code":"nv","ap":"Nev.","value":26.2},
		{"code":"nh","ap":"N.H.","value":26.7},
		{"code":"nj","ap":"N.J.","value":26.3},
		{"code":"nm","ap":"N.M.","value":26.4},
		{"code":"ny","ap":"N.Y.","value":25.4},
		{"code":"nc","ap":"N.C.","value":29.4},
		{"code":"nd","ap":"N.D.","value":31},
		{"code":"oh","ap":"Ohio","value":30.4},
		{"code":"ok","ap":"Okla.","value":32.5},
		{"code":"or","ap":"Ore.","value":26.5},
		{"code":"pa","ap":"Pa.","value":30},
		{"code":"ri","ap":"R.I.","value":27.3},
		{"code":"sc","ap":"S.C.","value":31.7},
		{"code":"sd","ap":"S.D.","value":29.9},
		{"code":"tn","ap":"Tenn.","value":33.7},
		{"code":"tx","ap":"Texas","value":30.9},
		{"code":"ut","ap":"Utah","value":24.1},
		{"code":"vt","ap":"Vt.","value":24.7},
		{"code":"va","ap":"Va.","value":27.2},
		{"code":"wa","ap":"Wash.","value":27.2},
		{"code":"wv","ap":"W.Va.","value":35.1},
		{"code":"wi","ap":"Wis.","value":29.8},
		{"code":"wy","ap":"Wyo.","value":27.8

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
	                 var s = 'Obesity rate in <b>' + this.point.ap + '</b>: ' + this.point.value + '%';
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
	                text: '<strong>Adult Obesity Rate</strong><br />Darker shades represent higher obesity rates.',
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
	                to: 25,
	                color: "#F7E39B"
	            }, {
	                from: 25.01,
	                to: 27,
	                color: "#F3D469"
	            }, {
	                from: 27.01,
	                to: 30,
	                color: "#EFC637"
	            }, {
	                from: 30.01,
	                to: 33,
	                color: "#B39429"
	            }, {
	                from: 33.01,
	                color: "#77631B"
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
