// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    //sketchBoxes();
    //artboardResizer();

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

var sketchBoxes = function() {
    var svg = d3.select('#graphic').append('svg');

    console.log(DATA);

    var xScale = d3.scale.sqrt()
        .domain([0, d3.max(DATA, function(d) {
            return +d['Number of cases'];
        })])
        .range([0,500]);

    var colorScale = d3.scale.sqrt()
        .domain([0, 67])
        .range([COLORS['orange6'], COLORS['orange3']]);

    console.log(xScale.domain());

    //var xScale = function(d) {
        //return Math.sqrt(d * 100);
    //};

    svg
        .attr('width', 600)
        .attr('height', d3.sum(DATA, function(d) {
            console.log(+d['Number of cases'], xScale(+d['Number of cases']), xScale(+d['Number of cases']) * xScale(+d['Number of cases']));
            return xScale(+d['Number of cases']) + 10;
        }));

    var boxOffset = 0;

    var boxes = svg.selectAll('g.box')
        .data(DATA)
        .enter()
            .append('g')
                .attr('class', 'box')
        .attr('transform', function(d,i) {
            var transformString = 'translate(0,' + boxOffset + ')';
            boxOffset += xScale(+d['Number of cases']) + 10;
            return transformString;
        });

    boxes.append('rect')
        .attr('width', function(d) {
            return xScale(+d['Number of cases']);
        })
        .attr('height', function(d) {
            return xScale(+d['Number of cases']);
        })
        .attr('fill', function(d) {
            return colorScale(+d['Number of cases']);
        });

    boxes.append('text')
        .text(function(d) {
            return d['Reporting country'];
        })
        .attr('fill', 'white')
        .attr('y', 10)
        .attr('x', 10);

    boxes.append('text')
        .text(function(d) {
            return +d['Number of cases'];
        })
        .attr('fill', 'white')
        .attr('y', 10)
        .attr('x', 10);

    pymChild.sendHeight();
};

/*
 * Hide/show artboards based on min/max width.
 * Use if you have weird sizes and the CSS is too cumbersome to edit.
 */
var artboardResizer = function() {
    // only want one resizer on the page
    if (document.documentElement.className.indexOf("g-resizer-v3-init") > -1) return;
    document.documentElement.className += " g-resizer-v3-init";
    // require IE9+
    if (!("querySelector" in document)) return;
    function resizer() {
        var elements = Array.prototype.slice.call(document.querySelectorAll(".g-artboard[data-min-width]")),
            widthById = {};
        elements.forEach(function(el) {
            var parent = el.parentNode,
                width = widthById[parent.id] || parent.getBoundingClientRect().width,
                minwidth = el.getAttribute("data-min-width"),
                maxwidth = el.getAttribute("data-max-width");
            widthById[parent.id] = width;
            if (+minwidth <= width && (+maxwidth >= width || maxwidth === null)) {
                el.style.display = "block";
            } else {
                el.style.display = "none";
            }
        });
        try {
            if (window.parent && window.parent.$) {
                window.parent.$("body").trigger("resizedcontent", [window]);
            }
            if (window.require) {
                require(['foundation/main'], function() {
                    require(['shared/interactive/instances/app-communicator'], function(AppCommunicator) {
                        AppCommunicator.triggerResize();
                    });
                });
            }
        } catch(e) { console.log(e); }
        pymChild.sendHeight();
    }
    document.addEventListener('DOMContentLoaded', resizer);
    // feel free to replace throttle with _.throttle, if available
    window.addEventListener('resize', _.throttle(resizer, 200));
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
