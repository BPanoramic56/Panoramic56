import requests
from time import sleep
from bs4 import BeautifulSoup
import json
import re

base_query = "https://en.wikipedia.org/wiki/"

with open("AirportNotFound.txt") as airport_list:
    airports = airport_list.readlines()
    
def dms_to_decimal(degrees, minutes, seconds, direction):
    decimal = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
    if direction in ['S', 'W']:
        decimal *= -1
    return decimal


def parse_dms(dms_str):
    match = re.match(r"(\d+)°(\d+)′(?:(\d+)″)?([NSEW])", dms_str)
    if not match:
        return None
    deg, mins, secs, dir_ = match.groups()
    return dms_to_decimal(
        int(deg),
        int(mins),
        int(secs) if secs else 0,
        dir_
    )

def alternate_search(airport_icao, not_available, added_airports):
    with open("Assets/Docs/IATA_ICAO.json") as info:
        data = json.load(info)
    
    for airport in data:
        print(airport["icao"])
        if airport["icao"] and airport["icao"] == airport_icao:
            added_airports[airport["icao"]] = {
                "name": airport["airport"],
                "icao": airport["icao"],
                "latitude": airport["latitude"],
                "longitude": airport["longitude"],
                "state": f"{airport['region_name']} - {airport['country_code']}"
            }
        else:
            not_available.add(airport_icao)
    
    return not_available
            

not_available = set()
added_airports = {}

for airport in airports:
    airport = airport.strip()
    print(f"\nAirport: {airport.strip()}")
    try:
        url = (base_query + airport).replace("\n", "")
        request = requests.get(url)
        soup = BeautifulSoup(request.text)
        
        title = soup.find("span", {"class" : "mw-page-title-main"}).text.replace(" - ", "").strip()
        
        infocard = soup.find("table", {"class": "vcard"})
        
        latitude = parse_dms(soup.find("span", {"class" : "latitude"}).text)
        print(f"latitude found: {latitude}")
        longitude = parse_dms(soup.find("span", {"class" : "longitude"}).text)
        print(f"longitude found: {longitude}")
        
        trs = infocard.find_all("tr")
        for tr in trs:
            if "Location" in tr.text:
                location = tr.text.replace("Location", "").replace(", ", " - ")
                if location.count("-") > 1:
                    location = location[:location.find("-")] + " - " + location[location.rfind("-")+1:]
                print("location found")
                break
                
        added_airports[airport] = {
            "name": title,
            "icao": airport,
            "latitude": latitude,
            "longitude": longitude,
            "state": location 
        }
        print(f"\tAdded {airport}")
        
    except AttributeError as e:
        not_available = alternate_search(airport, not_available, added_airports)

with open("Assets/Docs/Airports.json", "r") as input:
    data = json.load(input)

for airport in added_airports:
    data[airport] = added_airports[airport]
    
with open("Assets/Docs/Airports.json", "w") as input:
    json.dump(data, input, indent=4)

with open("AirportNotFound.txt", "w") as input:
    input.write("\n".join(not_available))