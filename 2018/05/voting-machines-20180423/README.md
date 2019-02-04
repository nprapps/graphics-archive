# Voting Machines - How Secure Is Your Vote?

This graphic originally accompanied the story "[U.S. Voting System Remains Vulnerable 6 Months Before Election Day. What Now?](https://www.npr.org/2018/05/08/599452050/the-u-s-voting-system-remains-vulnerable-6-months-before-election-day-what-now)" by Miles Parks. Brett Neely was the editor and Renee Klahr created the illustrations.

For as simple as this graphic looks, it as some dense code under the hood.

#### Data analysis
* The data analysis was done in [Jupyter notebook](https://github.com/nprapps/voting-machines/blob/master/jupyter/paper_trails.ipynb). The exports for `voting-machines-export` are used as a CSV uploaded to the google spreadsheet and as a json file in the `/data` folder for the twitter typeahead search box.

#### Additional Libraries
* `imagesloaded.pkgd.js` - used to check if images are fully loaded before sending pym height
* `lscache.min.js` - cache location after first geolocation
* `wherewolf.js` - locates a point within geographical boundaries using topojson
* `topojson.v2.min.js` - used for wherewolf geolocation
* `typeahead.bundle.js` - powers predictive search bar
