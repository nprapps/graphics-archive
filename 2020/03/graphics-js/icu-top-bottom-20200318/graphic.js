// Global vars
console.clear()

var userData = "";


var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var aria = require("./listbox-combobox.js");
var $ = require("./lib/qsa");
var COUNTIES = require("./counties.js");

var pymChild;

var { COLORS, makeTranslate, classify, formatStyle, fmtComma } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

function toAp(num){if(typeof(num)!="string"){numstripped=parseInt(num)}else{numstring=num.replace(/,|$|€|¥|%|(|)/g,'');numstripped=parseInt(numstring)};if(numstripped<10){var apnums=["zero","one","two","three","four","five","six","seven","eight","nine"];return apnums[numstripped]}else if(numstripped>999999){var striplength=numstripped.toString().length;if(striplength>=7&&striplength<=9){return((numstripped/1000000).toFixed(2)+' million').replace('.00','')}if(striplength>=10&&striplength<=12){return((numstripped/1000000000).toFixed(2)+' billion').replace('.00','')}if(striplength>=13&&striplength<=15){return((numstripped/1000000000000).toFixed(2)+' trillion').replace('.00','')}}else if(999>numstripped<999999){numstripped+='';x=numstripped.split('.');x1=x[0];x2=x.length>1?'.'+x[1]:'';var rgx=/(\d+)(\d{3})/;while(rgx.test(x1)){x1=x1.replace(rgx,'$1'+','+'$2')}return x1+x2}else{return numstripped}};
function toApState(postal){return {"AL":"Ala.","AK":"Alaska","AS":null,"AZ":"Ariz.","AR":"Ark.","CA":"Calif.","CO":"Colo.","CT":"Conn.","DE":"Del.","DC":"D.C.","FL":"Fla.","GA":"Ga.","GU":null,"HI":"Hawaii","ID":"Idaho","IL":"Ill.","IN":"Ind.","IA":"Iowa","KS":"Kan.","KY":"Ky.","LA":"La.","ME":"Maine","MD":"Md.","MA":"Mass.","MI":"Mich.","MN":"Minn.","MS":"Miss.","MO":"Mo.","MT":"Mont.","NE":"Neb.","NV":"Nev.","NH":"N.H.","NJ":"N.J.","NM":"N.M.","NY":"N.Y.","NC":"N.C.","ND":"N.D.","MP":null,"OH":"Ohio","OK":"Okla.","OR":"Ore.","PA":"Pa.","PR":null,"RI":"R.I.","SC":"S.C.","SD":"S.D.","TN":"Tenn.","TX":"Texas","UT":"Utah","VT":"Vt.","VI":null,"VA":"Va.","WA":"Wash.","WV":"W.Va.","WI":"Wis.","WY":"Wyo."}[postal]}


// Initialize the graphic.
var onWindowLoaded = function() {
  render(userData);

  window.addEventListener("resize", function(){
    render(userData)
  });

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(userData) {

  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  var datakey ='top';

  // handle user data
 
  var userDataMeasures = [];

  if (userData != "") {
    var matchUserDataRows = ALLDATA.filter(x=>x.DISPLAY == userData)
    // filter out tiny areas 
    var areaThreshold = 15000000;


    matchUserDataRows = matchUserDataRows.filter(x=>x.ATOTAL > areaThreshold)

    for (i in matchUserDataRows) {
      var matchRow = matchUserDataRows[i];
      var d = {};
      d['label'] = matchRow.REGIONNAME;
      d['state'] = matchRow.HRRSTATE;
      d['amt'] = matchRow.ICUPERK;
      d['beds'] = matchRow.ICUBEDS;
      d['rank'] = matchRow.RANK + " of 304";
      d['topbottom'] = 'middle';
      console.log(d)
      if (DATA.filter(x=>x.REGIONNAME ==  d['label']).length > 0) {
        d['topbottom'] = DATA.filter(x=>x.REGIONNAME ==  d['label'])[0].topbottom;
      }
      userDataMeasures.push(d)

    }

    // sort userDataMeasures

    var sortuserDataMeasures = function(a, b) {
      if (a.amt < b.amt) {
        return 1;
      }
      return -1;
    }

    userDataMeasures = userDataMeasures.sort(sortuserDataMeasures)

  }

 




  // render


  renderBarChart({
    container,
    width,
    data: DATA,
    datakey,
    userDataMeasures,
    allData: ALLDATA
  });

  renderAutoText(userDataMeasures);

  // // Render the chart!
  // container = "#bar-chart2";
  // element = document.querySelector(container);
  // width = element.offsetWidth;
  // datakey = 'bottom'
  // renderBarChart({
  //   container,
  //   width,
  //   data: DATA.filter(x=> x['topbottom'] == datakey),
  //   datakey
  // });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderAutoText = function(userDataMeasures) {

  insertIntroText = userDataMeasures.length > 1 ? LABELS.intro_template_text_plural : LABELS.intro_template_text_single;
  insertIntroText = insertIntroText.replace("{{COUNT}}", toAp(userDataMeasures.length))
  insertIntroText = insertIntroText.replace("{{COUNTY}}", userData)


 d3.select(".auto-text").html('');

  if (userDataMeasures.length > 0) {

    d3.select(".auto-text").append("div")
      .attr("class", "intro-auto-text")
      .html(insertIntroText);


    d3.select(".auto-text").append("div")
      .attr("class", "auto-table-hrr");

    d3.select(".auto-table-hrr").append("tr")
      .attr("class", "auto-table-hed")
      .html(`
        <td>Region</td>
        <td>ICU Beds</td>
        <td>Per 100,000 people</td>
        <td>National Rank</td>
      `);

    for (i in userDataMeasures) {
      var thisHRR = userDataMeasures[i];

      d3.select(".auto-table-hrr").append("tr")
        .html(`
          <td>${thisHRR.label}</td>
          <td>${thisHRR.beds}</td>
          <td>${parseInt(thisHRR.amt)}</td>
          <td>${thisHRR.rank}</td>
        `);
    }
  }
}

// Render a bar chart.
var renderBarChart = function(config) {

  var showRows = 5;


  // var userData = config.userData

  // var matchUserDataRows = config.allData.filter(x=>x.DISPLAY == userData)

  // var userDataMeasures = [];

  // for (i in matchUserDataRows) {
  //   var matchRow = matchUserDataRows[i];
  //   var d = {};
  //   d['label'] = matchRow.REGIONNAME;
  //   d['state'] = matchRow.STATENAME;
  //   d['amt'] = matchRow.ICUPERK;
  //   d['topbottom'] = 'middle';
  //   if (config.data.filter(x=>x.REGIONNAME ==  d['label']).length > -1) {
  //     d['topbottom'] = config.data.filter(x=>x.REGIONNAME ==  d['label']).topbottom;
  //   }
  //   userDataMeasures.push(d)

  // }

  // // sort userDataMeasures

  // var sortuserDataMeasures = function(a, b) {
  //   if (a.amt < b.amt) {
  //     return 1;
  //   }
  //   return -1;
  // }

  // userDataMeasures = userDataMeasures.sort(sortuserDataMeasures)


  config.data = [...DATA];

  var userDataMeasures = config.userDataMeasures;

  // add in data
  if (userDataMeasures.length == 0) {
    userDataMeasures = [{'label': "", "state": "", "amt": 0, "topbottom": "middle"}]
  }

  for (i=userDataMeasures.length; i--; i>0) {
    if (config.data.length < (showRows*2) + userDataMeasures.length) {
      config.data.splice(5,0,userDataMeasures[i])
    }
  }



  // Setup
  var labelColumn = "label";
  var valueColumn = "amt";

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 155;
  var leftAnnoWidth = 30;
  var labelMargin = 6;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 15,
    bottom: 20,
    left: labelWidth + labelMargin + leftAnnoWidth
  };


  var barsToChart = [...config.data.filter(x=>userDataMeasures.indexOf(x) == -1 || x.topbottom == 'middle')]


  var ticksX = 6;
  var roundTicksFactor = 25;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * barsToChart.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Create hed
  containerElement
    .append("h3")
    .attr("class", "graphic-hed region-hed")
    .html("Hospital regions");

  containerElement
    .append("h3")
    .attr("class", "graphic-hed")
    .html("ICU beds per 100,000 people");

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Create D3 scale objects.
  var floors = barsToChart.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = barsToChart.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  // var max = Math.max.apply(null, ceilings);
  // hardcode
  var max = 70;

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d) {
      return d.toFixed(0);
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = function() {
    return xAxis;
  };

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );



  //Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(barsToChart)
    .enter()
    .append("rect")
    .attr("x", d => d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn]))
    .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("height", barHeight)
    .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])} bar-${classify(d.topbottom)}`);

  // Render 0-line.
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight);
  }

// Render median line
  chartElement.append("line")
    .attr("x1", xScale(29.66) )
    .attr("x2", xScale(29.66) )
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr('class', 'median-line')

  chartElement.append('text')
      .text("National")
      .attr("x", xScale(29.66) + 5)
      .attr("y", chartHeight / 1.31)
      .attr('class', 'median-text')

  chartElement.append('text')
      .text("median")
      .attr("x", xScale(29.66) + 5)
      .attr("y", chartHeight / 1.25)
      .attr('class', 'median-text')

  // Render bar labels.
  chartWrapper
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: (labelWidth + leftAnnoWidth )+ "px",
        top: margins.top + "px",
        left: "0"
      })
    )
    .selectAll("li")
    .data(barsToChart)
    .enter()
    .append("li")
    .attr("style", function(d, i) {
      return formatStyle({
        width: (labelWidth + leftAnnoWidth) + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px"
      });
    })
    .attr("class", function(d) {
      return classify(d[labelColumn]);
    })
    .append("span")
    .text(function(d,i,a) {
      if (d.topbottom == 'top') {
       return (i+1) + ". " + d[labelColumn]
      }
      if (d.topbottom == 'bottom') {
        return 304-(a.length-(i+1)) + ". " + d[labelColumn]
      }
      if (d.topbottom == 'middle') {
        if (d.rank != undefined) {
          return d.rank.split(" ")[0] + ". " + d[labelColumn] + ", " + toApState(d['state'])
        }
        return d[labelColumn]
      }
    });

 
  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(barsToChart)
    .enter()
    .append("text")
    .text(d => d[valueColumn].toFixed(0))
    .attr("x", d => xScale(d[valueColumn]))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("dx", function(d) {
      var xStart = xScale(d[valueColumn]);
      var textWidth = this.getComputedTextLength();

      // Negative case
      if (d[valueColumn] < 0) {
        var outsideOffset = -(valueGap + textWidth);

        if (xStart + outsideOffset < 0) {
          d3.select(this).classed("in", true);
          return valueGap;
        } else {
          d3.select(this).classed("out", true);
          return outsideOffset;
        }
        // Positive case
      } else {
        if (xStart + valueGap + textWidth > chartWidth) {
          d3.select(this).classed("in", true);
          return -(valueGap + textWidth);
        } else {
          d3.select(this).classed("out", true);
          return valueGap;
        }
      }
    })
    .classed("hidden", d => d[valueColumn] == 0 ? true : false)
    .attr("dy", barHeight / 2 + 3);

    var nonMiddleUserRegion = userDataMeasures.filter(x=>x.topbottom != 'middle')

    for (k in barsToChart) {
      barsToChart[k].highlight = false;
    }

    if (nonMiddleUserRegion.length > 0) {
      for (i in nonMiddleUserRegion) {
        for (k in barsToChart) {
          if (classify(barsToChart[k].label).indexOf(classify(nonMiddleUserRegion[i].label)) > -1) {
            barsToChart[k].highlight = true;
          }
        }
      }
    }


    // recolor the bars
    d3.selectAll("rect")
      .classed("faded", function(d){
        if (userDataMeasures[0][valueColumn] == 0) {
          return false
        }
        if (d.highlight == true) {
          return false
        }

        var inUserData = userDataMeasures.filter(x=>x[labelColumn] == d[labelColumn]).length > 0;
        if (inUserData) {
          return false
        }
        return true
      })

    // change color if user chose top/bottom




    // add in left col labels

    var svg = chartWrapper.select("svg");

    var rightLabelPadding = 10;

    svg.append("line")
      .attr("x1", 7 )
      .attr("x2", 7 )
      .attr("y1", 0)
      .attr("y2", (barHeight+ barGap) * 5 )
      .attr('class', 'anno-line')

    svg.append('text')
      .text("most")
      .attr("x", margins.left - labelWidth - rightLabelPadding - 2 - 109)
      .attr("y", (barHeight+ barGap) * 5 - 324 /2 )
      .attr('class', 'side-text')
      .attr('transform', 'rotate(-90)')

    svg.append("line")
      .attr("x1", 7 )
      .attr("x2", 7 )
      .attr("y1", chartHeight)
      .attr("y2", chartHeight - (barHeight+ barGap) * 5 )
      .attr('class', 'anno-line')

    svg.append('text')
      .text("fewest")
      .attr("x", (chartHeight* -1) + ((barHeight+ barGap) * 5)/2 )
      .attr("y", (barHeight+ barGap) * 5 - 324 /2 )
      .attr('class', 'side-text')
      .attr('transform', 'rotate(-90)')

};



// interactive lookup

/*
*   This content is licensed according to the W3C Software License at
*   https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
*
* ARIA Combobox Examples
*/

function searchCounties (searchString) {
  var results = [];

  for (var i = 0; i < COUNTIES.length; i++) {
    var county = COUNTIES[i].toLowerCase();
    if (county.indexOf(searchString.toLowerCase()) === 0) {
      results.push(COUNTIES[i]);
    }
  }

  return results;
}

/**
 * @function onload
 * @desc Initialize the combobox examples once the page has loaded
 */
window.addEventListener('load', function () {

  var ex2Combobox = new aria.ListboxCombobox(
    document.getElementById('ex2-combobox'),
    document.getElementById('ex2-input'),
    document.getElementById('ex2-listbox'),
    searchCounties,
    true
  );

});

$.one("form").addEventListener("submit", (e) => e.preventDefault());

$.one("#ex2-input").addEventListener("selectAutoComplete", function(e) {
  userData = e.target.value
  render(userData)
});

// Initially load the graphic
window.onload = onWindowLoaded;
