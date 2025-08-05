import json

with open("AirlineStarter.JSON") as inp:
    air_codes = json.load(inp).keys()

full_data = {}
for airline in air_codes:
    try:
        with open(f"Assets/Docs/AIrlineRoutes/{airline}_output.json") as air_info:
            full_data[airline] = json.load(air_info)
    except FileNotFoundError as e:
        print(e)

with open("AirConnecta.json", "w") as outfile:
    json.dump(full_data, outfile, indent=4)