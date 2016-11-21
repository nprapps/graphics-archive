import agate

def get_buffalo_data(data):
    buffalo_data = data.where(lambda row: row['dest_city'] == 'Buffalo')
    buffalo_data.to_csv('output/dest-buffalo-2002-2015.csv')

def get_full_data():
    fulldata = agate.Table.from_csv('original/WRAPS-arrivals-by-destination-2002-2015-clean.csv')
    return fulldata

def data_by_year(data):
    by_origin = data.group_by('origin')
    column_names = ['origin','2002','2003','2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015']
    rows = []

    for i, origin in enumerate(by_origin):
        # Order by year for sanity check
        ordered = origin.order_by('year')

        # THIS SEEMS DUMB but just wanna get things done
        # Not all years are available for every country so default to zero
        origin_row = [ordered.rows[0]['origin'],0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        total_sum = 0

        for row in ordered.rows:
            # Create list of values by year
            year_index = column_names.index(str(row['year']))
            origin_row[year_index] = row['arrivals']
            total_sum += row['arrivals']

        origin_row.append(total_sum)
        rows.append(origin_row)

    # Add a 'total' column header
    column_names.append('total')
    origin_by_year = agate.Table(rows, column_names)
    origin_by_year.to_csv('output/new-origin_by_year-buffalo-2002-2015.csv')

def init():
    # fulldata = get_full_data()
    # get_buffalo_data(fulldata)
    buffalo_data = agate.Table.from_csv('original/new-buffalo-2002-2015-clean.csv')
    data_by_year(buffalo_data)

init()

