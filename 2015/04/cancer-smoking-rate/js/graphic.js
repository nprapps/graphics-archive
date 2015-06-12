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

	{"code":"al","ap":"Ala.","value":21.5},
	{"code":"ak","ap":"Alaska","value":22.6},
	{"code":"az","ap":"Ariz.","value":16.3},
	{"code":"ar","ap":"Ark.","value":25.9},
	{"code":"ca","ap":"Calif.","value":12.5},
	{"code":"co","ap":"Colo.","value":17.7},
	{"code":"ct","ap":"Conn.","value":15.5},
	{"code":"de","ap":"Del.","value":19.6},
	{"code":"dc","ap":"D.C.","value":18.8},
	{"code":"fl","ap":"Fla.","value":16.8},
	{"code":"ga","ap":"Ga.","value":18.8},
	{"code":"hi","ap":"Hawaii","value":13.3},
	{"code":"id","ap":"Idaho","value":17.2},
	{"code":"il","ap":"Ill.","value":18},
	{"code":"in","ap":"Ind.","value":21.9},
	{"code":"ia","ap":"Iowa","value":19.5},
	{"code":"ks","ap":"Kan.","value":20},
	{"code":"ky","ap":"Ky.","value":26.5},
	{"code":"la","ap":"La.","value":23.5},
	{"code":"me","ap":"Maine","value":20.2},
	{"code":"md","ap":"Md.","value":16.4},
	{"code":"ma","ap":"Mass.","value":16.6},
	{"code":"mi","ap":"Mich.","value":21.4},
	{"code":"mn","ap":"Minn.","value":18},
	{"code":"ms","ap":"Miss.","value":24.8},
	{"code":"mo","ap":"Mo.","value":22.1},
	{"code":"mt","ap":"Mont.","value":19},
	{"code":"ne","ap":"Neb.","value":18.5},
	{"code":"nv","ap":"Nev.","value":19.4},
	{"code":"nh","ap":"N.H.","value":16.2},
	{"code":"nj","ap":"N.J.","value":15.7},
	{"code":"nm","ap":"N.M.","value":19.1},
	{"code":"ny","ap":"N.Y.","value":16.6},
	{"code":"nc","ap":"N.C.","value":20.3},
	{"code":"nd","ap":"N.D.","value":21.2},
	{"code":"oh","ap":"Ohio","value":23.4},
	{"code":"ok","ap":"Okla.","value":23.7},
	{"code":"or","ap":"Ore.","value":17.3},
	{"code":"pa","ap":"Pa.","value":21},
	{"code":"ri","ap":"R.I.","value":17.4},
	{"code":"sc","ap":"S.C.","value":22},
	{"code":"sd","ap":"S.D.","value":19.6},
	{"code":"tn","ap":"Tenn.","value":24.3},
	{"code":"tx","ap":"Texas","value":15.9},
	{"code":"ut","ap":"Utah","value":10.3},
	{"code":"vt","ap":"Vt.","value":16.6},
	{"code":"va","ap":"Va.","value":19},
	{"code":"wa","ap":"Wash.","value":16.1},
	{"code":"wv","ap":"W.Va.","value":27.3},
	{"code":"wi","ap":"Wis.","value":18.7},
	{"code":"wy","ap":"Wyo.","value":20.6

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
	                 var s = 'Adult smoking rate in <b>' + this.point.ap + '</b>: ' + this.point.value + '%';
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
	                text: '<strong>Adult Smoking Rate</strong><br />Darker shades represent higher smoking rates.',
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
	                to: 13,
	                color: "#8BC0BF"
	            }, {
	                from: 13.01,
	                to: 17,
	                color: "#51A09E"
	            }, {
	                from: 17.01,
	                to: 20,
	                color: "#17807E"
	            }, {
	                from: 20.01,
	                to: 23,
	                color: "#11605E"
	            }, {
	                from: 23.01,
	                color: "#0B403F"
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
