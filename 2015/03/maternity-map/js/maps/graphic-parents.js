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
})

$(function () {

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
                 var matLeaveTime = _.chain(MAP_DATA).where({ "country": this.key  }).value()[0]['maternal_desc'];
                 var patLeaveTime = _.chain(MAP_DATA).where({ "country": this.key  }).value()[0]['paternal_desc'];
                 var s = '<b>' + this.key + '</b><br/>';
                 s += 'Leave Time: ' + this.series.name + '<br/>';
                 s += 'Maternal: ' + matLeaveTime + '<br/>';
                 s += 'Paternal: ' + patLeaveTime + '<br/>';
                 return s;
             },
			
         },
		 
		 
				 
        chart: {
            spacingBottom: 0
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
            enabled: true,
            enableMouseWheelZoom: false,
            buttonOptions: {
                verticalAlign: 'top'
            } },
		legend: {
			itemStyle: {
                color: '#000000',
                fontWeight: 'normal',
				fontSize: 12,
				paddingBottom: 4,
				backgroundColor: '#FCFFC5',
				borderColor: '#ffffff',
				
            },
			
            title: {
                text: 'Leave includes...',
            },
		    layout: 'vertical',
            align: 'left',
            floating: true,
            valueDecimals: 0,
            symbolRadius: 0,
            symbolHeight: 14,				    
        },

        plotOptions: {
			animation: false,
            map: {
                allAreas: false,
                joinBy: ['iso-a2', 'code'],
                dataLabels: {
                    enabled: false,
                },
                mapData: Highcharts.maps['custom/world-highres'],
                tooltip: {
                    headerFormat: '',
                    pointFormat: '{point.name}: <b>{series.name}</b>'
                }
            },
			
			series: {
				animation: false,
                states: {
                    hover: {
                        enabled: true,
						color: '#F7E39B'
                    }
                }
            },
        },

        series : [{
            name: 'Both parents <span class="countries">(96 countries)</span>',
			color: '#11605E',
            data: $.map(['AD','AF','AM','AR','AT','AU','AZ','BA','BE','BG','BH','BO','BR','BT','BY','CA','CD','CK','CL','CO','CU','CV','CZ','DE','DJ','DK','DO','DZ','EC','EE','ES','FI','FR','GB','GL','GM','GR','GT','HR','HU','ID','IL','IS','IT','JP','KE','KH','KR','LA','LT','LU','LV','MA','MC','MD','ME','MK','ML','MN','MR','MT','MU','MV','MX','MZ','NL','NO','NZ','PH','PL','PT','PY','RO','RS','RU','RW','SA','SE','SG','SI','SK','SM','SV','TD','TG','TJ','TL','TN','TZ','UA','UG','UY','UZ','VE','WS','XK','ZA'], function (code) {
                return { code: code };
            })
        }, {
            name: 'Mother only <span class="countries">(92 countries)</span>',
			color: '#51A09E',
            data: $.map(['AE','AG','AL','AO','BB','BD','BF','BI','BJ','BN','BS','BW','BZ','CF','CG','CH','CI','CM','CN','CR','CY','DM','EG','ER','ET','FJ','GA','GD','GE','GH','GN','GQ','GW','GY','HN','HT','IE','IN','IQ','IR','JM','JO','KG','KI','KM','KN','KP','KW','KZ','LB','LC','LI','LK','LR','LS','LY','MG','MM','MW','MY','NA','NE','NG','NI','NP','OM','PA','PE','PK','QA','SB','SC','SD','SL','SN','SO','SS','ST','SY','SZ','TH','TM','TR','TT','TV','VA','VC','VN','VU','YE','ZM','ZW'], function (code) {
                return { code: code };
            })
        }, {
            name: 'Neither <span class="countries">(9 countries)</span>',
			color: '#e9e9e9',
            data: $.map(['FM','MH','NR','NU','PG','PW','SR','TO','US'], function (code) {
                return { code: code };
            })
        }]
    });
});
//]]> 
