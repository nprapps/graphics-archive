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

		{"code":"al","ap":"Ala.","value":12.4},
		{"code":"ak","ap":"Alaska","value":19.5},
		{"code":"az","ap":"Ariz.","value":17.7},
		{"code":"ar","ap":"Ark.","value":13},
		{"code":"ca","ap":"Calif.","value":22.7},
		{"code":"co","ap":"Colo.","value":18.1},
		{"code":"ct","ap":"Conn.","value":15.7},
		{"code":"de","ap":"Del.","value":14.3},
		{"code":"dc","ap":"D.C.","value":18.5},
		{"code":"fl","ap":"Fla.","value":16.8},
		{"code":"ga","ap":"Ga.","value":16},
		{"code":"hi","ap":"Hawaii","value":18.3},
		{"code":"id","ap":"Idaho","value":17.6},
		{"code":"il","ap":"Ill.","value":16.9},
		{"code":"in","ap":"Ind.","value":13.2},
		{"code":"ia","ap":"Iowa","value":11.8},
		{"code":"ks","ap":"Kan.","value":14.2},
		{"code":"ky","ap":"Ky.","value":11.7},
		{"code":"la","ap":"La.","value":11.3},
		{"code":"me","ap":"Maine","value":17.9},
		{"code":"md","ap":"Md.","value":16.1},
		{"code":"ma","ap":"Mass.","value":16.9},
		{"code":"mi","ap":"Mich.","value":13.8},
		{"code":"mn","ap":"Minn.","value":14.3},
		{"code":"ms","ap":"Miss.","value":10.9},
		{"code":"mo","ap":"Mo.","value":13.2},
		{"code":"mt","ap":"Mont.","value":16.5},
		{"code":"ne","ap":"Neb.","value":14.2},
		{"code":"nv","ap":"Nev.","value":17.6},
		{"code":"nh","ap":"N.H.","value":17},
		{"code":"nj","ap":"N.J.","value":15.1},
		{"code":"nm","ap":"N.M.","value":17.8},
		{"code":"ny","ap":"N.Y.","value":16.2},
		{"code":"nc","ap":"N.C.","value":12.7},
		{"code":"nd","ap":"N.D.","value":11.7},
		{"code":"oh","ap":"Ohio","value":12.9},
		{"code":"ok","ap":"Okla.","value":10.6},
		{"code":"or","ap":"Ore.","value":19.7},
		{"code":"pa","ap":"Pa.","value":13.4},
		{"code":"ri","ap":"R.I.","value":14.9},
		{"code":"sc","ap":"S.C.","value":12.5},
		{"code":"sd","ap":"S.D.","value":11.6},
		{"code":"tn","ap":"Tenn.","value":11.2},
		{"code":"tx","ap":"Texas","value":14.9},
		{"code":"ut","ap":"Utah","value":17.2},
		{"code":"vt","ap":"Vt.","value":18.1},
		{"code":"va","ap":"Va.","value":16.4},
		{"code":"wa","ap":"Wash.","value":16.4},
		{"code":"wv","ap":"W.Va.","value":11.7},
		{"code":"wi","ap":"Wis.","value":13},
		{"code":"wy","ap":"Wyo.","value":16.3

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
	                 var s = 'Low vegetable consumption rate in <b>' + this.point.ap + '</b>: ' + this.point.value + '%';
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
	                text: '<strong>Low Vegetable Consumption Rate</strong><br />Darker shades represent lower consumption rates.',
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
	                to: 12,
	                color: "#005a32"
	            }, {
	                from: 12.01,
	                to: 14,
	                color: "#238b45"
	            }, {
	                from: 14.01,
	                to: 16,
	                color: "#41ab5d"
	            }, {
	                from: 16.01,
	                to: 18,
	                color: "#74c476"
	            }, {
	                from: 18.01,
	                color: "#c7e9c0"
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
