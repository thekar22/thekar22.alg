require 'rubygems'
require 'algoliasearch'
require 'json'

Algolia.init :application_id => ENV["ALGOLIA_APP_ID"],
             :api_key        => ENV["ALGOLIA_API_KEY"]

Encoding.default_external = 'UTF-8'

def fetch_json_data filename
	file = File.read(filename)
	data = JSON.parse(file)
end

def fetch_csv_data filename
	file = File.new(filename, "r")
	
	first_line = file.gets
	keys = first_line.split(";").each do |key|
		key.strip!
	end

	restaurant_info_dict = Hash.new
	while (line = file.gets)
		values = line.split(";")
		row = Hash.new
		1.upto(values.length-1) do |i|
			values[i].strip!
			row[keys[i]] = values[i]
		end
		restaurant_info_dict[values[0].to_i] = row
	end

	file.close
	restaurant_info_dict
end

restaurants_list = fetch_json_data 'restaurants_list.json' # array of objects
restaurants_info = fetch_csv_data 'restaurants_info.csv' # dictionary of objects

# custom formatting for spec implementation
cc_map = {
	"AMEX" => "American Express",
	"Carte Blanche" => "Discover",
	"Diners Club" => "Discover",
	"Discover" => "Discover",
	"MasterCard" => "MasterCard", 
	"Visa" => "Visa"
}

# combine lists, perform formatting on numerical columns
restaurants_list.each do |restaurant|
	id = restaurant["objectID"]
	restaurant_info = restaurants_info[id]
	restaurant_info.each do |key, val|
		if (key == "stars_count")
			val = val.to_f
			restaurant["stars_count_floor"] = val.floor
		elsif (key == "reviews_count")
			val = val.to_f
		end
		restaurant[key] = val
	end

	restaurant["payment_options_main"] = [];

	restaurant["payment_options"].each do |option|
		puts option
		if cc_map.key?(option)
			restaurant["payment_options_main"].push(cc_map[option])
		end
	end
end

index = Algolia::Index.new("restaurants")
index.add_objects(restaurants_list)