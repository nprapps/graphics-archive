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
	     style : { opacity: 1 },
			borderWidth: 0,
			borderColor: '#ffffff',
			borderRadius: 0,
             formatter: function(){
                 var s = '<b>' + this.key + '</b><br/>';
                 s += 'Leave Time: ' + this.series.name;
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
            enabled: true
        },
		
		credits: {
			enabled: false
		},
		
		exporting: {
			enabled: false
		},
		
		mapNavigation: {
            enabled: true,
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
                text: 'Time Off',
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
            name: '14 weeks or more',
			color: '#0B403F',
            data: $.map(['ME','TJ','AU','BE','DK','EE','FR','GB','GR','HU','KR','LU','LV','PL','RO','RS','XK','AT','DE','FI','HR','IT','JP','PT','SE','BG','IS','LT','NO','SI','AM','AZ','BY','CA','CU','CZ','GL','MD','MN','NZ','RU','SK','SM','UA','UZ'], function (code) {
                return { code: code };
            })
        }, {
            name: '3-13 weeks',
			color: '#17807E',
            data: $.map(['AD','CL','ES','LA','IL'], function (code) {
                return { code: code };
            })
        }, {
            name: 'Less than 3 weeks',
			color: '#51A09E',
            data: $.map(['AF','AR','BA','BH','BO','BR','BT','CD','CK','CO','CV','DJ','DO','DZ','EC','GM','GT','ID','KE','KH','MA','MC','MK','ML','MR','MT','MU','MV','MX','MZ','NL','PH','PY','RW','SA','SG','SV','TD','TG','TL','TN','TZ','UG','UY','VE','WS','ZA'], function (code) {
                return { code: code };
            })
        }, {
            name: 'No paid leave',
			color: '#C5DFDF',
            data: $.map(['AE','AG','AL','AO','BB','BD','BF','BI','BJ','BN','BS','BW','BZ','CF','CG','CH','CI','CM','CN','CR','CY','DM','EG','ER','ET','FJ','FM','GA','GD','GE','GH','GN','GQ','GW','GY','HN','HT','IE','IN','IQ','IR','JM','JO','KG','KI','KM','KN','KP','KW','KZ','LB','LC','LI','LK','LR','LS','LY','MG','MH','MM','MW','MY','NA','NE','NG','NI','NP','NR','NU','OM','PA','PE','PG','PK','PW','QA','SB','SC','SD','SL','SN','SO','SR','SS','ST','SY','SZ','TH','TM','TO','TR','TT','TV','US','VA','VC','VN','VU','YE','ZM','ZW'], function (code) {
                return { code: code };
            })
			/*}, {
            name: 'No data',
			color: '#999999',
            data: $.map(['EH'], function (code) {
                return { code: code };
            })*/
        }]
    });
});
//]]> 
