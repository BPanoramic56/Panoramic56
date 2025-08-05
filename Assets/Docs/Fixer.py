import json

with open("Assets/Docs/Airports.json") as airport_info:
    data = json.load(airport_info)
    

with open("AirConnecta.json") as airports:
    route_data = json.load(airports)
    
with open("Assets/Docs/IATA_ICAO.json") as all_ports:
    all_ports = json.load(all_ports)

airport_codes = data.keys()
airports = set()
aiports_not_found = set()

for airline in route_data:
    routes = route_data[airline]
    for route in routes:
        airports.add(route["origin"])
        airports.add(route["destination"])
        
for airport in airports:
    if airport not in airport_codes:
        aiports_not_found.add(airport)

for not_found in aiports_not_found:
    for airport in all_ports:
        if not_found == airport["icao"]:
            name = airport["airport"]
            icao = airport["icao"]
            latitude = airport["latitude"]
            longitude = airport["longitude"]
            state = airport["region_name"] + " - " + airport["country_code"]
            with open("Assets/Docs/FixerOutput.txt", "a") as output:
                output.write(f"\n\t\"{icao}\": {{\n\t\t\"name\": \"{name}\",\n\t\t\"icao\": \"{icao}\",\n\t\t\"latitude\": {latitude},\n\t\t\"longitude\": {longitude},\n\t\t\"state\": \"{state}\"\n\t}},")