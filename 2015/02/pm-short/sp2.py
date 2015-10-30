import ystockquote
from pprint import pprint
import datetime
import json
import csv

# pull today
now = datetime.datetime.now()
today = ("%s-%02d-%02d" % (now.year, now.month, now.day))
pprint(str(today)) #print today
quotes = ystockquote.get_historical_prices('SPY', '2015-01-15', today) #pull data

#writing json
with open('price.json', 'w') as file:
	json.dump(quotes,file)

#get current price
current_price = ystockquote.get_price('SPY')
current_date = now.strftime('%Y-%m-%d')
current_time = now.strftime('%H:%M:%S')

current_value = str(current_date) + "," + str(current_time) + "," + str(current_price)
header = "date,time,price"

with open('current.csv', 'wb') as f:
	fwriter = csv.writer(f, delimiter=" ")
	fwriter.writerow([header])
	fwriter.writerow([current_value])
