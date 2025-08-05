import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

const geoRadius = 4;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

let allAirlineRoutes =      [];
let allAirportInfo =        [];
let allAirlineInfo =        [];
let selectedAirlineRoutes = new Map();
let selectedRoutesSet =     []; // This is just to help parse through the airports that actually matter for the selected airline
let lineAggregate =         [];
let lineMeshes =            [];
let pulseDots =             [];
let allFlights = new Map();
let flightDensity = new Map();
let airlineTabs = [];
let airlineSelectionStart = 0;
const itemsPerPage = 4;

const params = {
    "Route Density": false,
    "Earth Rotation": false,
    "Dot Animation": false,
    "Variable Height": false,
    "Line Animation": 0,
    "Animation Speed": 1,
    "Line Length": 2,
    "Line Segments": 64,
    "Division Ratio": 50,
    "Airline": "",
    "Airport": "",
    "Mainline": true,
    "Regional": true,
    "Codeshare": true
}

class Flight{
    constructor(airline, flightNumber, origin, destination, operator, aircraft){
        this.airline = airline;
        this.flightNumber = flightNumber;
        this.origin = origin;
        this.destination = destination;
        this.operator = operator;
        this.aircraft = aircraft;
    }
}

function hasClass(element, className) {
    return (' ' + element.className + ' ').indexOf(' ' + className+ ' ') > -1;
}

function swapButtonStyle(buttonName){
    if (hasClass(document.getElementById(buttonName), "stylized-button-bw")){
        document.getElementById(buttonName).classList.remove("stylized-button-bw");
        document.getElementById(buttonName).classList.add("stylized-button");
    } 
    else{
        document.getElementById(buttonName).classList.add("stylized-button-bw");
        document.getElementById(buttonName).classList.remove("stylized-button");
    }
}

document.getElementById('getAirportInfoBtn').addEventListener('click', getAirportInfo);
document.getElementById('closeAirportInfoBtn').addEventListener('click', closeAirportInfoBtn);

document.getElementById('OperatorMainlineBtn').addEventListener('click',  () => {
    params["Mainline"] = !params["Mainline"];
    updateSelectedAirline(params["Airline"]);
    swapButtonStyle("OperatorMainlineBtn");
});
document.getElementById('OperatorRegionalBtn').addEventListener('click',  () => {
    params["Regional"] = !params["Regional"];
    updateSelectedAirline(params["Airline"]);
    swapButtonStyle("OperatorRegionalBtn");
});
document.getElementById('OperatorCodeshareBtn').addEventListener('click',  () => {
    params["Codeshare"] = !params["Codeshare"];
    updateSelectedAirline(params["Airline"]);
    swapButtonStyle("OperatorCodeshareBtn");
});

window.addEventListener('resize', onWindowResize, false);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 0.1;
const far = 200;
const textureLoader = new THREE.TextureLoader();

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
camera.position.z = 10;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const geometry = new THREE.IcosahedronGeometry(geoRadius, 100);

const earthMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load('earth-blue-marble.jpg'),
});

const earthGroup = new THREE.Group();
const earthMesh = new THREE.Mesh(geometry, earthMaterial);
earthGroup.add(earthMesh)

scene.add(earthGroup);
scene.add(new THREE.HemisphereLight(0xffffff, 0x000000));

let animationCount = 0;
 
function createAirlineButton(airline){
    const overDiv = document.createElement('div');
    const image = document.createElement('img');
    image.src = airline["Image"];
    overDiv.style.background = "rgb(255, 255, 255)";
    image.style.background = "inherit";
    image.style.height = "100%";
    image.style.width = "100%";
    image.style.maxHeight = "100px";
    image.style.maxWidth = "100px";
    overDiv.style.padding = "5px";
    overDiv.style.maxHeight = "100px"
    overDiv.style.maxWidth = "100px"

    overDiv.appendChild(image);
    image.addEventListener('click', function() {
        updateSelectedAirline(airline["ICAO"]);
    });
    airlineTabs.push(image);
}

function latLonToVector3(lat, lon, radius) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon + 180);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

function showInfoBox() {
    document.getElementById('AirportInfoBox').style.left = '20px'; // Slide into view
}

function hideInfoBox() {
    document.getElementById('AirportInfoBox').style.left = '-400px'; // Slide out
}

function closeAirportInfoBtn() {
    document.getElementById('PercentageContainer').style.left = '-400px'; // Slide out
}

function createNavButton(src, onClick) {
    const btn = document.createElement('img');
    btn.src = src;
    btn.className = 'nav-button';
    btn.onclick = onClick;
    return btn;
}

function showAirlineSelectionRange() {
    const container = document.getElementById('AirConnectaAirlineSidebar');
    container.innerHTML = '';

    const leftChevron = createNavButton('Assets/Images/chevron_left.png', () => {
        airlineSelectionStart = Math.max(0, airlineSelectionStart - itemsPerPage);
        showAirlineSelectionRange();
    });

    const rightChevron = createNavButton('Assets/Images/chevron_right.png', () => {
        airlineSelectionStart = Math.min(airlineTabs.length - itemsPerPage, airlineSelectionStart + itemsPerPage);
        showAirlineSelectionRange();
    });

    container.appendChild(leftChevron);

    const visibleTabs = airlineTabs.slice(airlineSelectionStart, airlineSelectionStart + itemsPerPage);
    visibleTabs.forEach(tab => container.appendChild(tab));

    container.appendChild(rightChevron);
}

function createAirlineDiv(airline, routes, totalFlights){
    const umbrellaDiv = document.createElement('div');
    umbrellaDiv.style.display = "grid";
    umbrellaDiv.style.gridTemplateColumns = "auto 1fr";
    umbrellaDiv.style.gap = "5px";

    const percentage = parseInt(routes/totalFlights * 100)
    const fullAirline = allAirlineInfo[airline];
    const airlineDiv = document.createElement('div');
    airlineDiv.classList.add('airlineDiv');
    airlineDiv.textContent = `${fullAirline['Name']} - ${routes} route${((routes > 1) ? 's' : '')} [${percentage}%]`;

    const container = document.createElement('div');
    container.className = 'progress-container';
    container.style.height = "30px";

    const airlineLogo = document.createElement('img');
    airlineLogo.src = allAirlineInfo[airline]["Image"];
    airlineLogo.style.height = "30px";
    airlineLogo.style.width = "30px";

    const fill = document.createElement('div');
    fill.className = 'progress-fill';

    fill.style.width = `${routes/totalFlights * 100}%`;
    const color = "#" + fullAirline["Color"].slice(2)
    fill.style.backgroundColor = color;  

    container.appendChild(fill);
    container.style.verticalAlign = "center";

    umbrellaDiv.appendChild(airlineLogo);
    umbrellaDiv.appendChild(container);
    umbrellaDiv.style.verticalAlign = "center";
    umbrellaDiv.style.alignContent = "center";

    airlineDiv.appendChild(umbrellaDiv);
    document.getElementById('PercentageContainer').appendChild(airlineDiv);
}

function getAirportInfo(){
    document.getElementById('PercentageContainer').style.left = '20px'; // Slide into view

    deleteFlightObjects()

    const flightsFromAirport = []
    const flightToDestination = new Map(); // Used to create flight density
    const airlinePercentage = new Map();
    const originAirportICAO = params["Airport"]["icao"];
    const originAirportName = params["Airport"]["name"];
    const originAirportObj = allAirportInfo[originAirportICAO];
    let totalDensity = 0

    const flights = allFlights.get(originAirportICAO);

    if (!flights){
        console.log(`No flights available for airport: ${params["Airport"]}`)
        return;
    }

    Object.values(flights).forEach(flight => {
        const destination = flight["destination"];
        const airline = flight["airline"];
        const operator = flight["operator"];
        flightsFromAirport.push(destination);
        
        if (flightToDestination[destination]){
            flightToDestination.set(destination, flightToDestination.get(destination) + 1)
        }
        else{
            flightToDestination[destination] = 1
            flightToDestination.set(destination, 1)
        }

        if (params["Route Density"]){
            addDensity(allAirportInfo[destination])
        }

        const destinationAirport = allAirportInfo[destination];
        if (!destinationAirport) {
            console.warn(`Destination airport not found: ${destination}`);
            return; // Skip this route because destination doesn't exist
        }

        const linePoints = createGeodesicLine(originAirportObj["latitude"], -originAirportObj["longitude"], destinationAirport["latitude"], -destinationAirport["longitude"], geoRadius);
        lineAggregate.push(linePoints);

        const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        geometry.setDrawRange(0, 0); 

        const material = new THREE.LineBasicMaterial({ 
            color: parseInt(parseInt(allAirlineInfo[operator]["Color"]))
        });
        const lineMesh = new THREE.Line(geometry, material);

        earthGroup.add(lineMesh);
        lineMeshes.push(lineMesh);
        
        if (airlinePercentage.has(operator)){
            airlinePercentage.set(operator, airlinePercentage.get(operator) + 1);
        }
        else{
            airlinePercentage.set(operator, 1);
        }
    });

    totalDensity += flights.length
    selectedRoutesSet = flightsFromAirport;

    selectedRoutesSet.push(originAirportICAO);

    const airlineInfo = document.querySelectorAll('.airlineDiv');
    airlineInfo.forEach(div => {
        div.remove();
    });

    document.getElementById('airportName').innerHTML = originAirportName;

    const airlinePercentageSorted = new Map([...airlinePercentage.entries()].sort((a, b) => b[1] - a[1]));
    
    airlinePercentageSorted.keys().forEach(operator => {
        createAirlineDiv(operator, airlinePercentageSorted.get(operator), totalDensity)
    });

    if (params["Route Density"]){
        addDensity(allAirportInfo[originAirportICAO], totalDensity, parseInt(allAirlineInfo[airlinePercentageSorted.keys().next().value]["Color"]))
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function addDensity(airportInfo, routeDensity, color = null) {

    if (!airportInfo){
        return;
    }
    if (!color){
        color = parseInt("0xFFFFFF");
    }

    // calculate the position where we need to start the cube
    var position = latLonToVector3(airportInfo["latitude"], -airportInfo["longitude"], geoRadius);

    const sizeRatio = 0.025
    const divisionRatio = params["Division Ratio"]

    var cube = new THREE.Mesh(
        new THREE.BoxGeometry(
            sizeRatio,
            sizeRatio,
            routeDensity/divisionRatio
        ),
        new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 10,
    }));
    
    const normal = position.clone().normalize();

    // Move the cube along the normal by half its height
    cube.position.copy(position.clone().add(normal.clone().multiplyScalar(routeDensity/divisionRatio/2)));

    // Orient the cube so it extends outward from the globe
    cube.lookAt(normal.clone().multiplyScalar(geoRadius + routeDensity/divisionRatio));

    // Add the total mesh to the scene
    earthGroup.add(cube);
}

document.addEventListener('keydown', function (e) {

    const mouseMovement = 0.01;

    // Making so that awsd and the arrows move the camera independently (detaching it from the earth geometry)
    switch (e.key) {
        case "w":
        case "ArrowUp":
            earthGroup.position.y -= mouseMovement;
            break;

        case "ArrowDown":
        case "s":
            earthGroup.position.y += mouseMovement;
            break;

        case "ArrowLeft":
        case "a":
            earthGroup.position.x += mouseMovement;
            break;

        case "ArrowRight":
        case "d":
            earthGroup.position.x -= mouseMovement;
            break;
    }
});

document.addEventListener("click", (evt) => {
    // Convert mouse click to NDC
    const mouse = new THREE.Vector2();
    mouse.x = (evt.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(evt.clientY / window.innerHeight) * 2 + 1;

    // Raycast
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(earthMesh);
    
    if (intersects.length > 0) {
        const point = intersects[0].point; // This is a 3D vector on the sphere

        // Convert Cartesian (x, y, z) to spherical coordinates
        const lat = 90 - (Math.acos(point.y / geoRadius) * 180 / Math.PI);
        const lon = ((Math.atan2(point.z, -point.x)) * 180 / Math.PI + 180) % 360 - 180;

        const airptSphereRadius = 0.025 // I may change this later to be a fraction of the geoRadius instead

        const acceptanceRange = 0.75; // How close to a (lat, lon) point is acceptable for an airport to be considered clickable 

        let airportFound = false;
        selectedRoutesSet.forEach(airportICAO => {
            const airport = allAirportInfo[airportICAO];
            if (airport){
                if (
                    airport["latitude"]-acceptanceRange <= lat && 
                    airport["latitude"]+acceptanceRange >= lat && 
                    airport["longitude"]-acceptanceRange <= lon && 
                    airport["longitude"]+acceptanceRange >= lon
                ){
                    const airportGeo = new THREE.Mesh(
                        new THREE.SphereGeometry(airptSphereRadius),
                        new THREE.MeshStandardMaterial({
                            color: parseInt(allAirlineInfo[params["Airline"]]["Color"], 16),
                            emissiveIntensity: 100
                        })
                    );

                    const airportCords = latLonToVector3(airport["latitude"], -airport["longitude"], geoRadius);
                    
                    airportGeo.position.set(airportCords.x, airportCords.y, airportCords.z);
                    
                    earthGroup.add(airportGeo);

                    document.getElementById("AirportNameInfo").innerHTML = airport["name"].toString();

                    document.getElementById("AirportInformation1").innerHTML = airport["state"].toString();

                    document.getElementById("AirportInformation2").innerHTML = `${airport["latitude"]}, ${airport["longitude"]}`

                    showInfoBox()
                    params["Airport"] = airport
                    airportFound = true;
                    return;
                }
            }
        });
        if (!airportFound){
            hideInfoBox()
        }
    }
});

function deleteFlightObjects(){
    earthGroup.children.slice().forEach((child) => {
        if (
            (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) || // Removes dots
            child instanceof THREE.Line || // Removes route lines
            child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) // Removes route density boxes
        {
            earthGroup.remove(child);
            child.geometry?.dispose?.();
            child.material?.dispose?.();
        }
    });
}

function updateOperatorGrid(grid, operators){
    grid.innerHTML = ''; // Clear previous items

    const count = operators.size;
    const gridSize = Math.ceil(Math.sqrt(count)); // 2 for 4, 3 for 5-9, etc.

    grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    operators.forEach(operator => {
        const img = document.createElement('img');
        img.className = 'Operator-Item';
        const imgSize = Math.max(100 - (count * 2), 40);
        img.alt = allAirlineInfo[operator]["Name"];
        img.style.height = `${imgSize}px`
        img.style.width = `${imgSize}px`
        img.src = allAirlineInfo[operator]["Image"];
        grid.appendChild(img);
    });
}
function showOperatorSelection(airlineName) {
    const operatorSidebar = document.getElementById("AirConnectaOperatorSidebar");
    const operatorMainlineDiv = document.getElementById("OperatorMainline");
    const operatorRegionalDiv = document.getElementById("OperatorRegional");
    const operatorCodeshareDiv = document.getElementById("OperatorCodeshare");
    const selectedAirlineRoutes = allFlights.get(airlineName);
    const airlineInfo = allAirlineInfo[airlineName];

    operatorMainlineDiv.innerHTML = "";
    operatorRegionalDiv.innerHTML = "";
    operatorCodeshareDiv.innerHTML = "";

    const mainline = [airlineName];
    const regionals = new Set();
    const codeshares = new Set();

    operatorSidebar.style.visibility = "visible";

    selectedAirlineRoutes.forEach(flight => {
        if (airlineInfo["Regionals"] && airlineInfo["Regionals"].includes(flight.operator)) {
            regionals.add(flight.operator);
        }
        else if (flight.operator != airlineName) {
            codeshares.add(flight.operator);
        }
    });
    

    // Reduce grid size to only two columns if either regionals are empty or codeshares are empty
    if (regionals.size > 0 && codeshares.size == 0 || regionals.size == 0 && codeshares.size > 0){
        document.getElementById("AirConnectaOperatorSidebar").style.gridTemplateColumns = "auto auto";
    }
    else{
        document.getElementById("AirConnectaOperatorSidebar").style.gridTemplateColumns = "auto auto auto";
    }
    
    // Update mainline grid
    updateOperatorGrid(operatorMainlineDiv, mainline);

    // Update regional grid
    if (regionals.size > 0){
        document.getElementById("OperatorRegionalOverDiv").style.visibility = "visible";
        updateOperatorGrid(operatorRegionalDiv, regionals);
    }
    else{
        document.getElementById("OperatorRegionalOverDiv").style.visibility = "hidden";
    }

    // Update codeshare grid
    if (codeshares.size > 0) {
        document.getElementById("OperatorCodeshareOverDiv").style.visibility = "visible";
        updateOperatorGrid(operatorCodeshareDiv, codeshares);
    }
    else {
        document.getElementById("OperatorCodeshareOverDiv").style.visibility = "hidden";
    }
}

function updateSelectedAirline(airlineName) {
    deleteFlightObjects();
    showOperatorSelection(airlineName);
    const airlineInfo = allAirlineInfo[airlineName];

    if (allFlights.has(airlineName)) {
        params["Airline"] = airlineName;
        selectedAirlineRoutes = allFlights.get(airlineName);

        selectedAirlineRoutes.forEach(flight => {
            if (flight.operator == airlineName) {
                if (!params["Mainline"]){
                    return;
                }
            }
            else if (airlineInfo["Regionals"] && airlineInfo["Regionals"].includes(flight.operator)) {
                if (!params["Regional"]){
                    return;
                }
            }
            else {
                if (!params["Codeshare"]){
                    return;
                }
            }

            selectedRoutesSet.push(flight.origin);
            selectedRoutesSet.push(flight.destination);

            const originAirport = allAirportInfo[flight.origin];
            const destinationAirport = allAirportInfo[flight.destination];

            if (!originAirport || !destinationAirport){
                console.warn(`Origin or Destination airport not found: ${flight.origin} - ${flight.destination}`);
                return;
            }
            
            if (params["Route Density"]){
                addDensity(originAirport, flightDensity.get(airlineName).get(flight.origin));
            }

            const linePoints = createGeodesicLine(originAirport["latitude"], -originAirport["longitude"], destinationAirport["latitude"], -destinationAirport["longitude"], geoRadius);

            lineAggregate.push(linePoints);

            const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
            geometry.setDrawRange(0, 0); 

            const material = new THREE.LineBasicMaterial({ 
                color: parseInt(allAirlineInfo[flight["operator"]]["Color"], 16),
            });
            const lineMesh = new THREE.Line(geometry, material);

            earthGroup.add(lineMesh);
            lineMeshes.push(lineMesh);

            // destinations.forEach((destination) => {
                // selectedRoutesSet.push(destination);

                // const destinationAirport = allAirportInfo[destination];
                // if (!destinationAirport) {
                    // console.warn(`Destination airport not found: ${destination}`);
                    // return; // Skip this route because destination doesn't exist
                // }

                // const linePoints = createGeodesicLine(originAirport["latitude"], -originAirport["longitude"], destinationAirport["latitude"], -destinationAirport["longitude"], geoRadius);
                // lineAggregate.push(linePoints);

                // const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                // geometry.setDrawRange(0, 0); 

                // const material = new THREE.LineBasicMaterial({ 
                //     color: parseInt(allAirlineInfo[airlineName]["Color"], 16),
                // });
                // const lineMesh = new THREE.Line(geometry, material);

                // earthGroup.add(lineMesh);
                // lineMeshes.push(lineMesh);
            });
        // });
    } 
    else {
        console.warn(`Airline "${airlineName}" not found.`);
    }
}

function handleLineAnimation(){
    switch(params["Line Animation"]){
        case 0:
            lineMeshes.forEach((line, i) => {
                const points = lineAggregate[i];
                if (animationCount <= points.length + params["Line Length"]){
                    if (animationCount < points.length){
                        if (animationCount % points.length - params["Line Length"] > 0){
                            const startLine = Math.max(0, animationCount % points.length - params["Line Length"]);
                            line.geometry.setDrawRange(startLine, animationCount % points.length);
                        }
                        else{
                            line.geometry.setDrawRange(0, animationCount % points.length);
                        }
                    }
                    else{
                        line.geometry.setDrawRange(animationCount - params["Line Length"], points.length);
                    }
                }
                else{
                    animationCount = 0;
                }
            });
            break;

        case 1:
            lineMeshes.forEach((line, i) => {
                const points = lineAggregate[i];
                line.geometry.setDrawRange(0, points.length);
            });
            break;

        case 2:
            break;
    }
}

function handleDotAnimation(){
    if (params["Dot Animation"]){
        const pulseDuration = 5000 / params["Animation Speed"];
        pulseDots.forEach(({ dot, points, startTime, delay}) => {
            dot.visible = true;
            if ((performance.now() - startTime - delay)> 0){
                const elapsed = (performance.now() - startTime - delay) % pulseDuration;
                const t = elapsed / pulseDuration;
                const index = Math.floor(t * (points.length - 1));

                dot.position.copy(points[index]);
            }
        });
    }
    else {
        pulseDots.forEach(({ dot }) => {
            dot.visible = false;
        });
    }
}

function createGeodesicLine(lat1, lon1, lat2, lon2, radius, segments = 128) {
    const start = latLonToVector3(lat1, lon1, radius);
    const end = latLonToVector3(lat2, lon2, radius);

    const points = [];

    let archHeight = 0.5;
    if (params["Variable Height"]){
        archHeight = Math.random();
    }

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;

        // Slerp to get arc path
        const interpolated = new THREE.Vector3().copy(start).normalize().lerp(end.clone().normalize(), t).normalize();

        // Boost upward along the normal
        const arcBoost = Math.sin(Math.PI * t) * archHeight;
        const lifted = interpolated.clone().multiplyScalar(radius + arcBoost);

        points.push(lifted);
    }
    
    const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.002, 8, 8),
        new THREE.MeshStandardMaterial({
        color: 0xa903fc,
        emissive: 0x11f0b8,
        emissiveIntensity: 100,
    }));

    earthGroup.add(dot);
    pulseDots.push({ 
        dot, 
        points: points, 
        startTime: performance.now(), 
        delay: Math.random() * 2500 // Adds up to 2.5s of delay to make the animation more "fluid" between the different routes
    });

    return points
}

function animate(t = 0) {

    handleLineAnimation();

    handleDotAnimation()

    animationCount += params["Animation Speed"];

    if (params["Earth Rotation"]){
        earthGroup.rotation.y = t * 0.0001;
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

function initGUI(){
    const gui = new dat.GUI();

    gui.add(params, "Dot Animation").onChange(function(val){
        params["Dot Animation"] = val;
    });
    
    gui.add(params, "Variable Height").onChange(function(val){
        params["Variable Height"] = val;
        updateSelectedAirline(params["Airline"])
    });

    gui.add(params, "Route Density").onChange(function(val){
        params["Route Density"] = val;
        updateSelectedAirline(params["Airline"])
    });

    gui.add(params, "Earth Rotation").onChange(function(val){
        params["Earth Rotation"] = val;
    });

    gui.add(params, "Line Animation", {
        "Default": 0,
        "No Animation": 1,
        "No Lines": 2
    }).onChange(function(val){
        updateSelectedAirline(params["Airline"]);
        params["Line Animation"] = parseInt(val);
    })

    gui.add(params, "Animation Speed", 0, 5).onChange(function(val){
        params["Animation Speed"] = val;
        animationCount = 0;
    });

    gui.add(params, "Line Length", 0, 128).onChange(function(val){
        params["Line Length"] = parseInt(val);
        animationCount = 0;
    });

    // const airlineList = ["AAL"];
    // Object.keys(allAirlineRoutes).forEach(airline => {
    //     airlineList[airline] = airline;
    // });

    // gui.add(params, "Airline", airlineList).onChange(function(val){
    //     updateSelectedAirline(val);
    // });


    Object.keys(allAirlineRoutes).sort().forEach(airline => {
        createAirlineButton(allAirlineInfo[airline]);
    });
}

function initVariables(){
    // In an effort to reduce the amount of calculations and changes that need to be done as the user chnages the variables in the website, my approach here is to create a giant directory of all flights, sorted and key-ed by various parameters for ease of access
    Object.keys(allAirlineRoutes).forEach(airline => {
        const routes = allAirlineRoutes[airline];
        routes.forEach(route => {
            const newFlight = new Flight(route["airline"], route["flightNumber"], route["origin"], route["destination"], route["operator"], route["aircraft"]);
            const airlineName = route["airline"];
            const origin = route["origin"];

            if (allFlights.has(airlineName)){
                let existingFlights = allFlights.get(airlineName);
                existingFlights.push(newFlight);
                allFlights.set(airlineName, existingFlights);
            }
            else{
                allFlights.set(airlineName, [newFlight]);
            }

            if (allFlights.has(origin)){
                let existingFlights = allFlights.get(origin);
                existingFlights.push(newFlight);
                allFlights.set(origin, existingFlights);
            }
            else{
                allFlights.set(origin, [newFlight]);
            }

            if (flightDensity.has(airlineName)){
                if (flightDensity.get(airlineName).has(origin)){
                    const airlineMap = flightDensity.get(airlineName);
                    const currentDensity = flightDensity.get(airlineName).get(origin);
                    airlineMap.set(origin, currentDensity + 1)
                }
                else{
                    flightDensity.get(airlineName).set(origin, 1);
                }
            }
            else{
                const densityMap = new Map();
                densityMap.set(origin, 1)
                flightDensity.set(airlineName, densityMap);
            }
        });
    });
}

async function init() {
    // Load airport info
    try {
        const airportResponse = await fetch('Assets/Docs/Airports.json');
        allAirportInfo = await airportResponse.json();
    } 
    catch (err) {
        console.error("Error loading airport info:", err);
    }

    // Load airline routes
    try {
        const routeResponse = await fetch('AirConnecta.json');
        // const routeResponse = await fetch('https://raw.githubusercontent.com/BPanoramic56/Panoramic56/refs/heads/main/Assets/Docs/AirConnecta.JSON');
        allAirlineRoutes = await routeResponse.json();
    }
    catch (err) {
        console.error("Error loading airline routes:", err);
    }

    // Load airline info
    try {
        const airlineResponse = await fetch('Assets/Docs/AirlineInfo.Json');
        allAirlineInfo = await airlineResponse.json();
    }
    catch (err) {
        console.error("Error loading airline routes:", err);
    }

    initVariables();

    initGUI();

    animate();

    showAirlineSelectionRange();
}

init(); // ← Start everything