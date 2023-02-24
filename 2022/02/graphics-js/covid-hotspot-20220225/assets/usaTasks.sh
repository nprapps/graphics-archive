###################Create states map ################

#filter data shapes
mapshaper raw_map_data/ne_50m_admin_1_states_provinces_lakes.shp \
	-filter where='admin == "United States of America"' \
	-o worked/states_filtered.json

# #filter data points
# mapshaper raw_map_data/ne_50m_admin_1_states_provinces_lakes.shp \
# 	-filter where='admin == "United States of America"' \
# 	-points centroid \
# 	-o worked/state-centroids.json

# mapshaper jhu-timeline-consolidated.csv -o worked/jhu-timeline.json

# # join data from JHU
# mapshaper worked/states_filtered.json \
# 	-join jhu-data.csv keys=name,"Province/State" fields=* \
# 	-o worked/states_filtered_joined.json

# mapshaper worked/state-centroids.json \
# 	-join jhu-data.csv keys=name,"Province/State" fields=* \
# 	-o worked/points-cases.json

# override joins?