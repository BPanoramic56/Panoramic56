import json
import re

with open("Assets/Docs/Airports.json") as input:
    data = json.load(input)

with open("Assets/Docs/IATA_ICAO.json") as info:
    airport_info = json.load(info)


for airport in airport_info:
    if airport["icao"] in data.keys():
        if airport["iata"] and airport["iata"] not in data[airport['icao']]["name"]:
            data[airport['icao']]["name"] = f'{airport["iata"]} {data[airport["icao"]]["name"]}'
        if airport['icao'] and airport['icao'] not in data[airport['icao']]["name"]:
            data[airport['icao']]["name"] = f'{data[airport["icao"]]["name"]} ({airport["icao"]})'

for airport in data:
    name = data[airport]["name"]
    match = re.search(r'\((\w{4})\)$', name)
    if match:
        icao = match.group(1)
        if len(icao) == 4:
            # The last 3 letters of ICAO
            possible_redundant = icao[1:]  # e.g. ACR from PACR
            if icao[0] == "P" or icao[0] == "K":
                continue
            # Remove if appears as separate token
            tokens = name.split()
            if possible_redundant in tokens:
                tokens.remove(possible_redundant)
                name = ' '.join(tokens)
                data[airport]["name"] = name
    
with open("AirportsFormatted.json", 'w') as output:
    json.dump(data, output, indent=4)