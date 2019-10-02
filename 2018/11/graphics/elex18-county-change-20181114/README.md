# elex18-county-change-20181114

The basemap here is comes from Census/TIGER shapefiles of state and county boundaries. (Zipfiles for both are in `assets/private/`. If you don't see them, run `fab assets.sync:elex18-county-change-20181114`.)

The map was optimized using Matthew Bloch's extremely helpful [mapshaper.org](https://mapshaper.org). I used the [command-line interface](https://github.com/mbloch/mapshaper/wiki/Command-Reference) to make all my changes, and I could see the result as I went.

## Steps:

Upload the zip files for the state map and the county map to Mapshaper. Then run through these *one at a time* in "console" view.

The first step for each is to filter out all U.S. territories, passing in the territory FIPS code. Next, project to AlbersUsa. Then simplify the map outlines.

### State map

```
mapshaper -filter '"60,69,66,72,78".indexOf(STATEFP) == -1'
mapshaper -proj albersusa
mapshaper -filter-fields GEOID
mapshaper -simplify 0.5% keep-shapes stats
mapshaper -clean
mapshaper -filter-islands min-area=100000000
```

### County map

```
mapshaper -filter '"60,69,66,72,78".indexOf(STATEFP) == -1'
mapshaper -proj albersusa
mapshaper -filter-fields GEOID
mapshaper -simplify 0.5% keep-shapes stats
mapshaper -clean
mapshaper -filter-islands min-area=100000000
```

EXPORT settings (these are extra parameters once you hit the export button)

```
precision=0.01 id-field=GEOID width=730 bbox
```
