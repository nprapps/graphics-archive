gun-votes-20171011
==================

This graphic makes use of MaxMind's [GeoIP](https://www.maxmind.com/en/geoip-demo?pkit_lang=en) service (city-level query) and the local storage JS library [lscache](https://github.com/pamelafox/lscache). (We pay per query for GeoIP, so we use lscache to cache users' queries for a limited time, so as not to use up more queries than we need.) Key things to note:

### `child_template.html`

Include references to the MaxMind JS and to the lscache library in the `block js` at the bottom of the page:

```
<script src="https://js.maxmind.com/js/apis/geoip2/v2.1/geoip2.js" type="text/javascript"></script>
{{ JS.push('js/lib/lscache.min.js') }}
```

### `graphic.js`

The code takes this general approach to geolocating the user:

**Step 1.** Check if the user's location is already stored in local storage:

```
var cachedState = lscache.get('geo_ip_state');
```

(In theory, we'd be using the same `geo_ip_state` param across our GeoIP projects, so if a user visited another project using GeoIP, they might already have this.)

* If it already exists, then display localized content accordingly.

    * `showState(classify(currentState));`<br />If it's a valid state, display localized content.
    * `_setLocateDefault();`<br />If it's not a valid state (user is international or our data doesn't include that state), then display some kind of default state-picker view.

* If it doesn't, then proceed to...

**Step 2.** If we don't already know the user's state, then geolocate them (spending one of the GeoIP queries we purchased).

For when the GeoIP library loads successfully:

```
if (typeof geoip2 === 'object') {
    geoip2.city(onLocateIP, onLocateFail);
}
```

A fallback for when it doesn't (the graphic uses the default view instead):

```
if (typeof geoip2 !== 'object') {
    _setLocateDefault();
}
```

**Step 3.** Handle the data returned by the GeoIP call (I'm adding more comments than are in the actual JS file):

```
var onLocateIP = function(response) {
    // console.log('geoip response', response);
```

Check if this user is in the U.S.:
```
    if (response['country']['iso_code'] == 'US' && typeof response['state'] != undefined) {
        currentState = response.most_specific_subdivision.iso_code;
```

Set the `lscache` for one day. (1440 == minutes)

```
        lscache.set('geo_ip_state', currentState, 1440);
```

If it's a state in our data, then localize the view. Otherwise, show the default.

```
        if (STATE_POSTAL_TO_FULL[currentState] == undefined) {
            // console.log('there is no data for ' + currentState);
            _setLocateDefault();
        } else {
            showState(classify(currentState));
        }
```

If the user isn't in the U.S., serve up the default view:
```
    } else {
        // console.log('onLocateIP: User is not in the U.S., or no state detected.');
        _setLocateDefault();
    }
}
```

Also show the default view if geolocation failed for some reason:

```
var onLocateFail = function(error) {
    console.warn(error);
    _setLocateDefault();
}
```

Set up what the user should see in the default view. (In the case of this graphic, nothing special. The user sees a list of possible states in both the geolocated or default case.)

```
var _setLocateDefault = function() {
    // Do nothing. User will see the overall list of states.
}
```
