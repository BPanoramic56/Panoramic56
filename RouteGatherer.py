#region imports
import os
import json
from time                           import sleep
from selenium                       import webdriver
from selenium                       import webdriver
from selenium.webdriver.common.by   import By
from selenium.webdriver.support.ui  import WebDriverWait
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support     import expected_conditions as EC

def update_start(airline, code):
    with open("AirlineStarter.JSON", "r") as infile:
        try:
            data = json.load(infile)
        except json.JSONDecodeError:
            data = {}
    
    data[airline] = code
    
    with open("AirlineStarter.JSON", "w") as outfile:
        json.dump(data, outfile, indent=4)

def export(flight_dict, airline):
    filename = f"{airline}_output.json"

    # Load existing data
    if os.path.exists(filename):
        with open(filename, "r") as infile:
            try:
                data = json.load(infile)
            except json.JSONDecodeError:
                data = {}
    else:
        data = {}

    # Ensure correct structure
    if airline not in data:
        data[airline] = {}

    # If old structure was a list, convert it
    if isinstance(data[airline], list):
        merged = {}
        for entry in data[airline]:
            if isinstance(entry, dict):
                for k, v in entry.items():
                    merged[k] = v
        data[airline] = merged

    # Merge the flight_dict into existing data
    for origin, destinations in flight_dict.items():
        if origin not in data[airline]:
            data[airline][origin] = []
        # Avoid duplicates
        for dest in destinations:
            if dest not in data[airline][origin]:
                data[airline][origin].append(dest)

    # Write back updated JSON
    with open(filename, "w") as outfile:
        json.dump(data, outfile, indent=4)
        
with open("AirlineStarter.json", "r") as start_input:
    airlines_codes = json.load(start_input).keys()
    
print(airlines_codes)
# airlines_codes = ["AAL", "UAL", "DAL", "JBU", "BAW", "QTR", "KLM"]

query = "https://www.flightaware.com/live/flight/"

relevant_keywords = ["gate", "where", "taxiing", "arriving", "landed", "depart", "terminal"]
ignorable_keywords = ["month", "months", "year", "years"]

options = Options()
options.headless = True

while True:
    for airline in airlines_codes:
        try:
            print("Opening Driver")
            driver = webdriver.Firefox(options=options)
            flights = {}
            with open("AirlineStarter.json", "r") as start_input:
                start_code = json.load(start_input)[airline]
            for code in range(start_code, 10_000):
                tries = 0
                not_available = False
                while tries < 3:
                    if not_available:
                        break
                    driver.get(query + airline + str(code))
                    sleep(1)
                    try:
                        status = WebDriverWait(driver, 2).until(EC.presence_of_element_located((By.CLASS_NAME, "flightPageSummaryStatus")))        
                        print(f"{airline}{code} - Status found: {status.text}")
                        if not status or not status.text:
                            print(f"\t\tNo Status -> {airline}{code}")
                            break
                        status = status.text.lower()
                        if any(keyword in status for keyword in ignorable_keywords):
                            print(f"\tMonth Clause -> {airline}{code}")
                            break
                        if not any(keyword in status for keyword in relevant_keywords):
                            print(f"\tNot present -> {airline}{code}")
                            break
                        
                        codes = driver.find_elements(By.CLASS_NAME, "displayFlexElementContainer")
                        origin, destination = codes[0].text, codes[1].text
                        
                        if origin and destination and origin.strip() != destination.strip():
                            if origin in flights:
                                flights[origin.strip()] += [destination.strip()]
                            else:
                                flights[origin.strip()] = [destination.strip()]
                        print(f"Added: {airline}{code}")
                        break
                    except Exception as e:
                        unknown = driver.find_element(By.CLASS_NAME, "flightPageUnknownData")
                        if unknown:
                            not_available = True
                            print(f"\tNon-existent -> {airline}{code}")
                            continue
                        print(e)
                        tries += 1
                        if tries >= 3:
                            export(flights, airline)
                        sleep(1)
                if code % 20 == 0:
                    print(f"\t\tDispatched [{code}][{len(flights)}]")
                    export(flights, airline)
                    flights = {}
                    update_start(airline, code)
                    
            export(flights, airline)
            update_start(airline, 10000)
            driver.quit()
        except Exception as e:
            print(f"Major: {e}")
            driver.quit()
            sleep(5)