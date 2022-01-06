var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series_michigan = formatData(window.DATA_MICHIGAN);
  // var series_north_dakota = formatData(window.DATA_NORTH_DAKOTA);
  var series_illinois = formatData(window.DATA_ILLINOIS);
  var series_pennsylvania = formatData(window.DATA_PENNSYLVANIA);
  var series_minnesota = formatData(window.DATA_MINNESOTA);
  var series_nebraska = formatData(window.DATA_NEBRASKA)
  var series_puerto_rico = formatData(window.DATA_PUERTO_RICO)
  // var series_vermont = formatData(window.DATA_VERMONT)

  //var DATA_ILLINOIS = <%= JSON.stringify(COPY.data_illinois) %>;
  //var DATA_NORTH_DAKOTA = <%= JSON.stringify(COPY.data_north_dakota) %>;
  //var DATA_CONNECTICUT = <%= JSON.stringify(COPY.data_connecticut) %>;
  // var DATA_PUERTO_RICO = <%= JSON.stringify(COPY.data_puerto_rico) %>;
  // var DATA_VERMONT = <%= JSON.stringify(COPY.data_vermont) %>;



  render(series_michigan,
        series_puerto_rico,
        series_nebraska,
        series_illinois,
        series_pennsylvania,
        series_minnesota,)//,series_florida);

  window.addEventListener("resize", () => render(series_michigan,
                                                series_puerto_rico,
                                                series_nebraska,
                                                series_illinois,
                                                series_pennsylvania,
                                                series_minnesota,
                                                ));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);

    if (d["7-day average"] == "null") {
      d["7-day average"] = null;
    }
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }

  return series;
};

var renderLegend = function(colorScale) {
  var legendWrapper = d3.select('.key-wrap');
    var legendElement = d3.select('.key');

    legendElement.innerHTML = ""

    legend = legendElement
      .selectAll("g")
      .data(config.data)
      .enter()
      .append("li")
      .attr("class", d => "key-item " + classify(d.name));

      legend.append("b").style("background-color", d => colorScale(d.name));

      legend.append("label").text(d => d.name);
}

// Render the graphic(s). Called by pym with the container width.
var render = function(data1,data2,data3,data4,data5,data6) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector('.graphic');
  var width = element.offsetWidth;

  element.innerHTML = '';

  renderLineChart({
    element,
    width,
    data:data1,
    dateColumn: "date",
    valueColumn: "amt",
    state: "Michigan"
  });


  renderLineChart({
    element,
    width,
    data:data2,
    dateColumn: "date",
    valueColumn: "amt",
    state: "Puerto Rico"
  });

  // renderLineChart({
  //   element,
  //   width,
  //   data:data3,
  //   dateColumn: "date",
  //   valueColumn: "amt",
  //   state: "Vermont"
  // });

  // renderLineChart({
  //   element,
  //   width,
  //   data:data4,
  //   dateColumn: "date",
  //   valueColumn: "amt",
  //   state: "North Dakota"
  // });

  renderLineChart({
    element,
    width,
    data:data3,
    dateColumn: "date",
    valueColumn: "amt",
    state: "Nebraska"
  });

  renderLineChart({
    element,
    width,
    data:data4,
    dateColumn: "date",
    valueColumn: "amt",
    state: "Illinois"
  });

  renderLineChart({
    element,
    width,
    data:data5,
    dateColumn: "date",
    valueColumn: "amt",
    state: "Pennsylvania"
  });

  renderLineChart({
    element,
    width,
    data:data6,
    dateColumn: "date",
    valueColumn: "amt",
    state: "Minnesota"
  });

  


  // uniqueStates = window.ORDERED;//['AL', 'AK', /*'AS',*/ 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', /*'FM',*/ 'FL', 'GA', /*'GU',*/ 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', /*'MH',*/ 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', /*'MP',*/ 'OH', 'OK', 'OR', /*'PW',*/ 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', /*'VI',*/ 'VA', 'WA', 'WV', 'WI', 'WY']
  // highlightStates = window.ORDERED.slice(0,6);
  // extremePercents = window.EXTREME;
  // //console.log(uniqueStates)

  // for (i in uniqueStates) {
  //   // if (i!=0) { continue}
  //   var filteredData = window.DATA.filter(a => a.state == uniqueStates[i])[0].data;
  //   //console.log(filteredData)
  //   var filteredStack =  stackGen(filteredData);

    
  //   renderAreaChart({
  //     element,
  //     state: uniqueStates[i],
  //     filteredStack,
  //     dateColumn: "date",
  //     colorScale: colorScale,
  //     highlightStates,
  //     extremePercents,
  //     index: i,
  //   });

  // }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
