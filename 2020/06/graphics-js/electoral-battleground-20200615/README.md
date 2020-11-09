# electoral-battleground-20200615

## Generating the geographic map

Commands for filtering a Natural Earth states/provinces/lakes layer in Mapshaper:

```
filter 'adm0_a3 == "USA"'
proj albersusa
clean
filter-fields postal
simplify 4%
```

SVG export settings

```
svg-data="postal"
```

## TODO

* Abstract the template code to pass in config params
* Nudge electoral map up a little bit; fix z-index issue with control buttons
* Scenario mode: highlight states that would flip from 2016
* Cartogram: move AK to the bottom next to HI
* electoral #s get lost
