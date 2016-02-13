rm data/states.json
rm data/counties.json
rm data/geodata.json

ogr2ogr -f GeoJSON -clipsrc -180 -14.6 -29.9 77.2 data/states.json -where "adm0_a3 = 'USA'" ~/.mapturner/data/ne_10m_admin_1_states_provinces_lakes/ne_10m_admin_1_states_provinces_lakes.shp
ogr2ogr -f GeoJSON -clipsrc -180 -14.6 -29.9 77.2 data/counties.json ~/.mapturner/data/cb_2014_us_county_20m/cb_2014_us_county_20m.shp

topojson -o data/geodata.json --id-property GEOID,postal -q 1e3 -- data/states.json data/counties.json
