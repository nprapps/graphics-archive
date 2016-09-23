all: clean_csv clean_json places.json countries.json isis.csv iraq_syria.json clean_shapefiles

isis.csv:
	rm -f isis.csv
	curl -L https://docs.google.com/spreadsheets/d/18GcBvY6uaRJCvNhH72v9J1zxlmeft8Mf0-fPaMSz5lY/export?format=csv --cookie tmp.cookie > $@

clean_csv:
	rm -f isis.csv

clean_json:
	rm -f places.json countries.json iraq_syria.json

clean_shapefiles:
	rm -f ne_10m_*.*

iraq_syria.json: isis.csv
	topojson -o $@ --properties NAME,id,date,name,contested -- $< places.json countries.json

places.json: ne_10m_populated_places.shp
	ogr2ogr -f GeoJSON -where "SOV0NAME IN ('Iraq','Syria') AND SCALERANK < 8 AND NAME IN ('Aleppo', 'Hims', 'Damascus', 'Ar Raqqah', 'Mosul', 'Irbil', 'Kirkuk', 'Tikrit', 'Baghdad', 'Al Fallujah', 'Basra')" $@ $<

# Country outlines for Syria and Iraq
countries.json: ne_10m_admin_0_countries.shp
	ogr2ogr -f GeoJSON -where "ADMIN IN ('Iraq','Syria')" $@ $<
	topojson -o $@ --properties NAME -- countries=$@

ne_10m_populated_places.zip:
	curl -L 'http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/ne_10m_populated_places.zip' -o $@.download
	mv $@.download $@

ne_10m_admin_0_countries.zip:
	curl -L 'http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/ne_10m_admin_0_countries.zip' -o $@.download
	mv $@.download $@

ne_10m_populated_places.shp: ne_10m_populated_places.zip
	unzip $<

ne_10m_admin_0_countries.shp: ne_10m_admin_0_countries.zip
	unzip $<
