var urlparser = (function() {
    /** Get url data and store it in the app context */
    function get(u){
        var result = null;
        var re = /^(-?[1-9]\d*\.?\d+|true|false|null|-?0\.\d+)$/;
        var re_dailygraphics_rig = /^.*parentUrl=(.*)$/;
        var re_parentUrl = /^.*?\?(.*?)(?:#.*)?$/;

        // If a URL is passed use that, use the location hash otherwise
        u = u ? u : location.search.substr(1);

        // Check if we are inside the dailygraphics local rig
        var m = u.match(re_dailygraphics_rig)
        if (m) {
            var decoded = decodeURIComponent(m[1])
            // Only if in localhost parse parentUrl instead
            if (decoded.includes("localhost")) {
                var dm = decoded.match(re_parentUrl)
                if (dm) u = dm[1];
            }
        }
        if(u){
            result = {};
            u.split("&").forEach(function(part) {
                var item = part.split("=");
                var val = decodeURIComponent(item[1])
                if(val){
                    if (re.test(val)) {
                        result[item[0]] = eval(val);
                    }
                    else {
                        result[item[0]] = val;
                    }
                }
                else {
                    result[item[0]] = null;
                }
            });
        }
        return result;
    }

    return {
        get: get
    };
})();
