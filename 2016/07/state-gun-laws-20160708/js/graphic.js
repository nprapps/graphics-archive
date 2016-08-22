// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});
    render();

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

var formatData = function(data) {
    var formatted_data = [];
    var stacks = ['restrict', 'expand', 'other'];
    var groups = ['pass', 'pend', 'fail'];

    data.forEach(function(v,k) {
        var row_data = {};
        for (var key in v) {
            // Add non-data attributes for reference
            if (_.indexOf(stacks, key.split('_')[0]) < 0) {
                row_data[key] = v[key];
            } else {
                // Add data in arrays
                var chart_data = [];
                stacks.forEach(function(stack_label) {
                    var stack_data = [];
                    groups.forEach(function(group_label) {
                        stack_data.push(+v[stack_label + '_' + group_label]);
                    });
                    chart_data.push(stack_data);
                });

                row_data['values'] = chart_data;
            }
        }

        formatted_data.push(row_data);
    });

    return formatted_data;
};

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    DATA = formatData(DATA);

    // Render the chart!
    renderGraphic({
        container: '#graphic',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a graphic.
 */
var renderGraphic = function(config) {
    var stacks = ['Restricts access', 'Expands access', 'Other'];
    var groups = ['pass', 'pend', 'fail'];

    var template = _.template(d3.select('#shooting-template').html());
    var containerElement = d3.select(config['container']);

    config['data'].forEach(function(v,k) {
        var partyWrapper = containerElement.select('.party-wrapper.party-' + v['political_leaning']);
        var row_div = partyWrapper.append('div')
            .attr('class', 'shooting-wrapper shooting-' + v['state']);
        var template_html = template(v);
        row_div.html(template_html);

        var graphicWrap = row_div.select('.graphic-wrap');
        v['values'].forEach(function(stack_data, stack_i) {
            if (k == 3 || k != 3 && stack_i < 2) {
                var rowWrap = graphicWrap.append('div')
                    .attr('class', 'row-wrap row-' + classify(stacks[stack_i]));

                rowWrap.append('span')
                    .attr('class', 'stack-label')
                    .text(stacks[stack_i]);

                var boxWrap = rowWrap.append('div')
                    .attr('class', 'row-boxes');

                stack_data.forEach(function(group_data, group_i) {
                    for (var i=0; i<group_data; i++) {
                        boxWrap.append('span')
                            .attr('class', 'box group-' + groups[group_i] + ' row-' + classify(stacks[stack_i]));
                    }
                });

                if (d3.sum(stack_data) === 0) {
                    boxWrap.append('span')
                        .attr('class', 'label-none')
                        .text('None');
                }
            }
        });
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
