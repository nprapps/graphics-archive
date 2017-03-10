var ElectionSimulator = function(usage_container, sce_container, rslt_container, tab_container, ctrl_container, footer_container, adjustments, interactive, footer, scenario, data, headers) {
    var _self = this;

    _self.usage_container = usage_container;
    _self.sce_container = sce_container;
    _self.rslt_container = rslt_container;
    _self.tab_container = tab_container;
    _self.ctrl_container = ctrl_container;
    _self.footer_container = footer_container;
    _self.adjustments = adjustments;
    _self.interactive = interactive;
    _self.data = data;
    _self.footer = footer;
    _self.scenario = scenario;
    _self.headers = headers;
    _self.tossUpStates = _.pluck(data, 'state');
    _self.usps_states = _.pluck(data, 'state_usps');
    _self.isMobile = false;
}


ElectionSimulator.prototype.calculateOutcome = function(adjustments) {
    var _self = this;
    var processedData = [];
    _.each(_self.data, function(row) {
        var processedRow = {};
        var projectedGOPVotes = 0;
        var projectedDemVotes = 0;
        var adjustedGOPVotes = 0;
        var adjustedDemVotes = 0;
        var adjustedOtherVotes = 0;
        _.each(row.demographics, function(demographic) {
            var adjustment = adjustments.adjustments[demographic.demographic];

            var adjustedDemPct = demographic.d_pct - adjustment.pct;
            adjustedDemPct = (adjustedDemPct < 0) ? 0 : adjustedDemPct;
            adjustedDemPct = (adjustedDemPct > 1) ? 1 : adjustedDemPct;

            var adjustedGOPPct = demographic.r_pct + adjustment.pct;
            adjustedGOPPct = (adjustedGOPPct < 0) ? 0 : adjustedGOPPct;
            adjustedGOPPct = (adjustedGOPPct > 1) ? 1 : adjustedGOPPct;

            var adjustedTurnout = demographic.turnout + adjustment.turnout;
            adjustedTurnout = (adjustedTurnout < 0) ? 0 : adjustedTurnout;
            adjustedTurnout = (adjustedTurnout > 1) ? 1 : adjustedTurnout;

            var adjustedVotes = demographic.eligible_voters * adjustedTurnout;

            adjustedOtherVotes = Math.abs(demographic.r_pct - demographic.d_pct) * demographic.eligible_voters * demographic.turnout;
            adjustedGOPVotes += adjustedVotes * adjustedGOPPct;
            adjustedDemVotes += adjustedVotes * adjustedDemPct;
        }, row);

        var adjustedTotalVotes = adjustedGOPVotes + adjustedDemVotes + adjustedOtherVotes;
        processedRow.demPct = adjustedDemVotes / adjustedTotalVotes;
        processedRow.gopPct = adjustedGOPVotes / adjustedTotalVotes;
        processedRow.margin = processedRow.gopPct - processedRow.demPct;

        processedRow.state = row.state;
        processedRow.state_usps = row.state_usps
        processedRow.electoralVotes = row.electoral_votes;

        processedData.push(processedRow);
    });
    return processedData;
}

ElectionSimulator.prototype.getScenarios = function() {
    var _self = this;

    return {
        scenario: _self.scenario,
        interactive: _self.interactive,
        data: _self.headers
    }
}

ElectionSimulator.prototype.getUsage = function() {
    var _self = this;

    return {
        interactive: _self.interactive,
        data: _self.headers
    }
}

ElectionSimulator.prototype.getFooter = function() {
    var _self = this;

    return {
        footer: _self.footer,
        data: _self.headers
    }
}

ElectionSimulator.prototype.getDetails = function(outcome) {
    var _self = this;
    var outcomes = {}


    if (_self.isMobile) {
        var list = _self.usps_states;
        var key = 'state_usps';
    }
    else {
        var list = _self.tossUpStates;
        var key = 'state';
    }

    for(var i = 0; i < list.length; ++i) {
        outcomes[list[i]] = [];
    }

    _.each(outcome, function(row) {
        var marginPct = Math.abs(row.margin) * 100;
        var winnerClass = (row.margin > 0) ? 'gop' : 'dem';
        var marginClass = 'margin-' + marginPct.toFixed(0);
        var gopPct = Math.abs(row.gopPct) * 100;
        outcomes[row[key]].push({
            winnerClass: winnerClass,
            marginClass: marginClass,
            margin: marginPct.toFixed(2),
            // TODO: Remove after
            gopPct: gopPct.toFixed(1),
            electoralVotes: row.electoralVotes
        });
    });

    return {
        rows: outcomes
    }
}

ElectionSimulator.prototype.getTotals = function(outcome) {
    var _self = this;

    var electoralVotes = {gop: 143, dem: 136};
    _.each(outcome, function(row) {
        var winnerClass = (row.margin > 0) ? 'gop' : 'dem';
        electoralVotes[winnerClass] += row.electoralVotes;
    });

    return {
        electoralVotes: electoralVotes
    }
}

ElectionSimulator.prototype.getControls = function() {
    var _self = this;
    return {
        adjustments: _self.adjustments.adjustments,
        interactive: _self.interactive,
        mobile: _self.isMobile
    }
}

ElectionSimulator.prototype.watchControl = function(e) {
    var _self=this;
    var outcome = _self.calculateOutcome(_self.adjustments);
    var totals = _self.getTotals(outcome)
    _self.totalsRactive.set('electoralVotes', totals.electoralVotes);
    var details = _self.getDetails(outcome)
    _self.detailsReactive.set('rows', details.rows);

}

ElectionSimulator.prototype.render = function(config) {
        var _self = this;
        _self.isMobile = config.isMobile;

        // Lauch initial calculations
        var outcome = _self.calculateOutcome(_self.adjustments);

        _self.usageRactive = new Ractive({
            el: _self.usage_container,
            template: '#usage-template',
            data: _self.getUsage()
        });

        _self.scenariosRactive = new Ractive({
            el: _self.sce_container,
            template: '#scenarios-template',
            data: _self.getScenarios()
        });

        _self.totalsRactive = new Ractive({
            el: _self.rslt_container,
            template: '#results-template',
            data: _self.getTotals(outcome)
        });

        _self.controlsRactive = new Ractive({
            el: _self.ctrl_container,
            template: '#controls-template',
            data: _self.getControls()
        });

        _self.detailsReactive = new Ractive({
            el: _self.tab_container,
            template: '#margin-table-template',
            data: _self.getDetails(outcome)
        });

        _self.creditsRactive = new Ractive({
            el: _self.footer_container,
            template: '#footer-template',
            data: _self.getFooter()
        });

        //Bind watchControl to the ElectionSimulator instance object
        if (_self.interactive) {
            _self.controlsRactive.observe('*', _self.watchControl.bind(_self));
        }

        // Reset all sliders to initial position
        _self.controlsRactive.on({
            restart: function ( event ) {
            // do something
                 _.each(_self.adjustments.adjustments, function(adj) {
                    adj.pct = 0.00;
                    adj.turnout = 0.00;
                });
                _self.controlsRactive.set({adjustments: _self.adjustments.adjustments});
            }
        });
}
