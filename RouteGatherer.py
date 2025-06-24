import bs4
import requests
import json

request_1 = requests.get("https://www.alaskaair.com/en/sitemap/flights-from-city-to-city/page-1")
request_2 = requests.get("https://www.alaskaair.com/en/sitemap/flights-from-city-to-city/page-2")
soup = bs4.BeautifulSoup(request_1.text + request_2.text)

list_elements = soup.find_all("li")
route_dict = {}

alaska_translation = {
    "Adak": "PADK",
    "Albuquerque": "KABQ",
    "Anchorage": "PANC",
    "Atlanta": "KATL",
    "Auckland": "NZAA",
    "Austin": "KAUS",
    "Baltimore": "KBWI",
    "Barrow": "PABR",
    "Belize City": "MZBZ",
    "Bellingham": "KBLI",
    "Bethel": "PABE",
    "Billings": "KBIL",
    "Boise": "KBOI",
    "Boston": "KMHT",
    "Bozeman": "KBZN",
    "Burbank": "KBUR",
    "Charleston": "KCHS",
    "Chicago": "KORD",
    "Cincinnati": "KCVG",
    "Cleveland": "KCLE",
    "Columbus": "KCMH",
    "Dallas": "KDFW",
    "Denver": "KDEN",
    "Detroit": "KDTW",
    "Dillingham": "PADL",
    "Dutch Harbor": "PADU",
    "Edmonton": "CYEG",
    "El Paso": "KELP",
    "Eugene": "KTOL",
    "Everett": "KUCY",
    "Fairbanks": "PAFA",
    "Fort Lauderdale": "KFLL",
    "Fresno": "KFAT",
    "Fukuoka": "RJFF",
    "Great Falls": "KGTF",
    "Gustavus": "PAGS",
    "Helena": "KHLN",
    "Honolulu": "PHNL",
    "Jackson": "KJAC",
    "Kansas City": "KMCI",
    "Ketchikan": "PAKT",
    "King Salmon": "PAKN",
    "Kodiak": "PADQ",
    "Kona": "PHKO",
    "Kotzebue": "PAOT",
    "La Paz": "MMLP",
    "Las Vegas": "KLVS",
    "Lihue": "PHLI",
    "Long Beach": "KLGB",
    "Los Angeles": "KLAX",
    "Medford": "KMFR",
    "Miami": "KMIA",
    "Minneapolis": "KMSP",
    "Missoula": "KMSO",
    "Monterey": "KMRY",
    "Nashville": "KBNA",
    "Nassau": "MYNN",
    "New Orleans": "KMSY",
    "New York": "KJFK",
    "Newark": "KEWR",
    "Nome": "PAOM",
    "Oakland": "KOAK",
    "Oklahoma City": "KOKC",
    "Omaha": "KOMA",
    "Ontario": "KONT",
    "Orlando": "KMCO",
    "Osaka": "RJBB",
    "Palm Springs": "KPSP",
    "Petersburg": "PAPG",
    "Papeete, Tahiti": "NTAA",
    "Pasco": "KPSC",
    "Petersburg": "PAPG",
    "Philadelphia": "KPHL",
    "Phoenix": "KPHX",
    "Portland": "KPDX",
    "Puerto Vallarta": "MMPR",
    "Pullman": "KPUW",
    "Raleigh": "KRDU",
    "Redding": "KRDD",
    "Redmond": "KRDM",
    "Reno": "KRNO",
    "Sacramento": "KSMF",
    "Saint Louis": "KSTL",
    "Salt Lake City": "KSLC",
    "San Antonio": "KSAT",
    "San Diego": "KSAN",
    "San Francisco": "KSFO",
    "San Jose": "KSJC",
    "San Luis Obispo": "KSBP",
    "Santa Barbara": "KSBA",
    "Santa Rosa": "KSXU",
    "Seattle": "KSEA",
    "Santa Ana": "KSNA",
    "Sun Valley": "KSUN",
    "Sydney": "YSSY",
    "Tampa": "KTPA",
    "Tokyo": "RJAA",
    "Toronto": "CYYZ",
    "Tucson": "KTUS",
    "Vail": "KEGE",
    "Vancouver": "CYVR",
    "Victoria": "CYYJ",
    "Walla Walla": "KALW",
    "Washington, D.C.": "KDCA",
    "Wenatchee": "KEAT",
    "Wichita": "KICT",
    "Wrangell": "PAWG",
    "Yakima": "KYKM",
    "Yakutat": "PAYA",
    "Maui": "PHOG",
    "Kalispell": "KGPI",
    "Cordova": "PACV",
    "Juneau": "PAJN",
    "Sitka": "PASI",
    "Spokane": "KGEG",
    "Cabo San Lucas": "MMSL",
    "Pittsburgh": "KPIT",
    "Seoul": "RKSI",
    "Indianapolis": "KIND",
    "Cancun": "MMUN",
    "Steamboat Springs": "KSBS",
    "Ixtapa-Zihuatanejo": "MMZH",
    "Liberia, CR": "MRLP",
    "Loreto": "MMLT",
    "Mazatlan": "MMMZ",
    "Guadalajara": "MMGL",
    "San Jose, CR": "MROC",
    "Calgary": "CYVC",
    "Fort Myers": "KRSW",
    "Houston": "KHOU",
    "Idaho Falls": "KIDA",
    "Kelowna": "CYLW",
    "Milwaukee": "KMKE",
    "Monterrey": "KMRY",
    "Canada" : "INVALID",
    "air travel rights": "INVALID",
    "Prudhoe Bay": "PASC",
    "Guatemala City": "MGGT",
    "Manzanillo": "MMZO"
}

for element in list_elements:
    if " - " in element.text:
        origin, destination = element.text.split(" - ")
        if origin in route_dict:
            route_dict[origin] += [destination]
        else:
            route_dict[origin] = [destination]
            
with open("Assets/Docs/Airports.json") as info:
    with open("airport_output.txt", "w") as out:
        out.write("")
    with open("airport_output.txt", "a") as out:
        info_dict = json.load(info)
        for origin in route_dict:
            out.write("{")
            out.write(f"\t\"{alaska_translation[origin]}\":[")
            for destination in route_dict[origin]:
                out.write(f"\t\t\"{alaska_translation[destination]}\",")
            out.write("\t]")
            out.write("}")