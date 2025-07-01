import json

with open("AirConnecta.json") as input:
    data = input.readlines()

with open("Assets/Docs/Airports.json") as input:
    completed_airport = json.load(input)
    
with open("Assets/Docs/IATA_ICAO.json") as input:
    iata_icao = json.load(input)

new_data = []
not_found = []

for line in data:
    if "{" in line or "}" in line: # Ignore "data" lines
        new_data.append(line)
        continue
    original_line = line
    for airport in iata_icao:
        if airport["iata"] and airport["iata"] in line:
            line = line.replace(airport["iata"], airport["icao"])
            if airport["icao"] not in completed_airport:
                not_found.append(airport["icao"])
            break # Stop it from re-replacing stuff
    new_data.append(line)

with open("AirConnectaConverted.JSON", "w") as outfile:
    json.dump(json.loads("".join(new_data)), outfile)
    
with open("AirportNotFound.txt", "w") as outfile:
    outfile.write("\n".join(not_found))