import json

with open("AirConnecta.json") as input:
    data = json.load(input)

with open("Assets/Docs/Airports.json") as input:
    completed_airport = json.load(input)
    
with open("Assets/Docs/IATA_ICAO.json") as input:
    iata_icao = json.load(input)

new_data = []
not_found = set()

for airline in data:
    for route in data[airline]:
        origin_found = False
        destination_found = False
        for airport in iata_icao:
            # print(route)
            try:
                if route["origin"] == airport["iata"]:
                    route["origin"] = airport["icao"]
                    origin_found = True
                if route["destination"] == airport["iata"]:
                    route["destination"] = airport["icao"]
                    destination_found = False
            except Exception as e:
                print(route)
        if not origin_found:
            not_found.add(route["origin"])
        if not destination_found:
            not_found.add(route["destination"])

with open("AirConnectaConverted.JSON", "w") as outfile:
    json.dump(data, outfile, indent=4)
    
with open("AirportNotFound.txt", "w") as outfile:
    outfile.write("\n".join(not_found))
    # if "{" in line or "}" in line: # Ignore "data" lines
    #     new_data.append(line)
    #     continue
    # original_line = line
    # for airport in iata_icao:
    #     if airport["iata"] and airport["iata"] in line:
    #         line = line.replace(airport["iata"], airport["icao"])
    #         if airport["icao"] not in completed_airport:
    #             not_found.append(airport["icao"])
    #         break # Stop it from re-replacing stuff
    # new_data.append(line)

# with open("AirConnectaConverted.JSON", "w") as outfile:
#     json.dump(json.loads("".join(new_data)), outfile)