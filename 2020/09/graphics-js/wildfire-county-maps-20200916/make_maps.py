import subprocess
import os

try: 
	os.mkdir("temp")
	os.mkdir("maps")
except:
	pass

years = ["2011","2012","2013","2014","2015","2016","2017","2018","2019","2020"]

for y in years:
	filterCommand = '''mapshaper -i shapefiles/clipped_counties.shp -join data/{year}.csv keys=GEOID,code field-types=GEOID:str,code:str -filter "Category >= 1" -style fill="#fdbb84" -style where="Category > 1" fill="#fc8d59" -style where="Category > 4" fill="#ef6548" -style where="Category > 7" fill="#d7301f" -o format=shapefile temp/{year}.shp'''

	mergeCommand = '''mapshaper -i shapefiles/states_lakes.shp temp/{year}.shp combine-files -proj +proj=lcc +lat_1=33.88333333333333 +lat_2=32.78333333333333 +lat_0=32.16666666666666 +lon_0=-116.25 +x_0=2000000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs -o format=svg maps/{year}.svg'''

	subprocess.call(filterCommand.format(year=y), shell = True)
	subprocess.call(mergeCommand.format(year=y), shell = True)


