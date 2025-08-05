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

class Flight():
    def __init__(self, airline, flight_number, origin, destination, operator, aircraft):
        self.airline = airline
        self.number = flight_number
        self.origin  = origin
        self.destination = destination
        self.operator = operator
        self.aircraft = aircraft
    
    def print(self):
        return f"{self.airline}, {self.origin} - {self.destination}\n\t{self.operator}, {self.aircraft}"
    
    def to_dict(self):
        return {
            "airline": self.airline,
            "flightNumber": self.number,
            "origin": self.origin,
            "destination": self.destination,
            "operator": self.operator,
            "aircraft": self.aircraft
        }

def update_start(airline, code):
    with open("AirlineStarter.JSON", "r") as infile:
        try:
            data = json.load(infile)
        except json.JSONDecodeError:
            data = {}
    
    data[airline] = code
    
    with open("AirlineStarter.JSON", "w") as outfile:
        json.dump(data, outfile, indent=4)

def export(flight, airline):
    filename = f"AirlineRoutes/{airline}_output.json"
    print(filename)

    if not os.path.exists(filename):
        print("Creating file")
        with open(filename, "w") as input:
            input.write("[]")
            
    # Load existing data if the file exists, otherwise start with an empty list
    try:
        with open(filename, "r") as f:
            data = json.load(f)
            if not isinstance(data, list):
                data = [data]
    except FileNotFoundError:
        data = []

    # Append the new flight
    if isinstance(flight, dict):
        data.append(flight)
    else:
        data.append(flight.to_dict())

    # Write back to the file
    with open(filename, "w") as f:
        json.dump(data, f, indent=2)
        
    print("DISPATCHED!!!!!!!!!!!!!!!!!!!!!!!!!!")
        
with open("AirlineStarter.json", "r") as start_input:
    airlines_codes = json.load(start_input).keys()
    
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
                                
                        operator = driver.find_elements(By.CLASS_NAME, "flightPageData")
                        
                        flightPageDetail = driver.find_element(By.XPATH, "//div[@data-template='live/flight/detailOther']")
                        print(flightPageDetail)
                        
                        liveFlightAirline = driver.find_element(By.XPATH, "//div[@data-template='live/flight/airline']")
                        
                        aircraft = flightPageDetail.find_element(By.CLASS_NAME, "flightPageData")
                        
                        operator = liveFlightAirline.find_element(By.CLASS_NAME, "flightPageData")
                        
                        print(aircraft.text)
                        print(operator.text)
                        
                        new_flight = Flight(
                            airline = airline,
                            flight_number = code,
                            origin = origin,
                            destination= destination,
                            operator = operator.text,
                            aircraft = aircraft.text
                        )
                        
                        print(f"\t\tDispatched [{code}][{len(flights)}]")
                        export(new_flight, airline)
                        flights = {}
                        update_start(airline, code)
                        
                        break
                    except Exception as e:
                        print(e)
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
                    
            export(flights, airline)
            update_start(airline, 10000)
            driver.quit()
        except Exception as e:
            print(f"Major: {e}")
            driver.quit()
            sleep(5)