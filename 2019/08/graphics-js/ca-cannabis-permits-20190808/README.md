# Mapshaper commands

The SVG for this map was created using [Mapshaper](https://mapshaper.org) to filter, project and simplify a U.S. county shapefile.

Commands used:

```
-filter 'STATEFP=="06"
-filter-fields GEOID,NAME
-proj +proj=aea +lat_1=34 +lat_2=40.5 +lat_0=0 +lon_0=-120 +x_0=0 +y_0=-4000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs
-simplify 20%
```

Export setting:
index-id=GEOID
