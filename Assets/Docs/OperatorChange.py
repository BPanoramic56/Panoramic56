import json

with open("AirConnectaConverted.JSON", "r") as input:
    raw_data = json.load(input)
    
with open("Assets/Docs/AirlineInfo.Json", "r") as input:
    airline_info = json.load(input)

for airline in raw_data:
    for flight in raw_data[airline]:
        for air in airline_info:
            if airline_info[air]["Callsign"] == flight["operator"]:
                flight["operator"] = airline_info[air]["ICAO"]
                break

with open("AirConnecta.json", "w") as output:
    json.dump(raw_data, output, indent=4)

with open("AirConnecta.json", "r") as new_input:
    new_data = json.load(new_input)

all_operators = set()

for airline in new_data:
    for flight in new_data[airline]:
        all_operators.add(flight["operator"])

for operator in all_operators:
    print(operator.replace(f"\"", r"\""))