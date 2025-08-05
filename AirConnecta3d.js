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

const params = {
    "Route Density": true,
    "Earth Rotation": false,
    "Dot Animation": true,
    "Variable Height": true,
    "Line Animation": 0,
    "Animation Speed": 1,
    "Line Length": 2,
    "Line Segments": 64,
    "Division Ratio": 10,
    "Airline": "",
    "Airport": ""
}

document.getElementById('getAirportInfoBtn').addEventListener('click', getAirportInfo);
document.getElementById('closeAirportInfoBtn').addEventListener('click', closeAirportInfoBtn);

window.addEventListener('resize', onWindowResize, false);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 0.1;
const far = 100;
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

function createAirlineDiv(airline, routes, totalFlights){
    if (airline == "LAN"){ // LAN is not wortking yet
        return;
    }

    const umbrellaDiv = document.createElement('div');
    umbrellaDiv.style.display = "grid";
    umbrellaDiv.style.gridTemplateColumns = "auto 1fr";
    umbrellaDiv.style.gap = "5px";

    const percentage = parseInt(routes/totalFlights * 100)
    const fullAirline = allAirlineInfo[airline]
    const airlineDiv = document.createElement('div');
    airlineDiv.classList.add('airlineDiv');
    airlineDiv.textContent = `${fullAirline['Name']} - ${routes} route${((routes > 1) ? 's' : '')} [${percentage}% market share]`;

    const container = document.createElement('div');
    container.className = 'progress-container';
    container.style.height = "30px";

    const airlineLogo = document.createElement('img');
    airlineLogo.src = `Assets/Images/AirlineLogos/${airline}_Logo.png`
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
    const originAirport = params["Airport"]
    let totalDensity = 0

    Object.keys(allAirlineRoutes).forEach(airline => {
        if (airline == "LAN"){
            return;
        }
        const destinations = allAirlineRoutes[airline][originAirport["icao"]]

        if (!destinations){ // Airline has no destinations from the selected airport, early return
            return;
        }
        
        Object.values(destinations).forEach(destination => {
            flightsFromAirport.push(destination);
            
            if (flightToDestination[destination]){
                flightToDestination.set(destination, flightToDestination.get(destination) + 1)
            }
            else{
                flightToDestination[destination] = 1
                flightToDestination.set(destination, 1)
            }

        if (params["Route Density"]){
            addDensity(allAirportInfo[destination], flightToDestination.get(destination))
        }

        if (!originAirport) {
            console.warn(`Origin airport not found: ${originAirport}`);
            return; // Skip this route because origin doesn't exist
        }

        const destinationAirport = allAirportInfo[destination];
        if (!destinationAirport) {
            console.warn(`Destination airport not found: ${destination}`);
            return; // Skip this route because destination doesn't exist
        }

        const linePoints = createGeodesicLine(originAirport["latitude"], -originAirport["longitude"], destinationAirport["latitude"], -destinationAirport["longitude"], geoRadius);
        lineAggregate.push(linePoints);

        const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        geometry.setDrawRange(0, 0); 

        const material = new THREE.LineBasicMaterial({ 
            color: parseInt(parseInt(allAirlineInfo[airline]["Color"]))
        });
        const lineMesh = new THREE.Line(geometry, material);

        earthGroup.add(lineMesh);
        lineMeshes.push(lineMesh);
        })
        
        airlinePercentage.set(airline, destinations.length)
        totalDensity += destinations.length
    });

    selectedRoutesSet = flightsFromAirport;
    selectedRoutesSet.push(originAirport["icao"]);

    const airlinePercentageSorted = new Map([...airlinePercentage.entries()].sort((a, b) => b[1] - a[1]));

    // document.getElementById('PercentageContainer').innerHTML = ''
    const airlineInfo = document.querySelectorAll('.airlineDiv');
    airlineInfo.forEach(div => {
        div.remove();
    });

    airlinePercentageSorted.keys().forEach(airline => {
        createAirlineDiv(airline, airlinePercentageSorted.get(airline), totalDensity)
    });

    if (params["Route Density"]){
        addDensity(originAirport, totalDensity, parseInt(allAirlineInfo[airlinePercentageSorted.keys().next().value]["Color"]))
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
        color = parseInt(allAirlineInfo[params["Airline"]]["Color"])
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

function updateSelectedAirline(airlineName) {

    deleteFlightObjects()

    if (allAirlineRoutes[airlineName]) {

        selectedAirlineRoutes = Object.entries(allAirlineRoutes[airlineName]).map(([origin, destinations]) => {
            return { [origin]: destinations };
        });

        selectedAirlineRoutes.forEach(route => {
            const origin = Object.keys(route)[0];
            const destinations = route[origin];  

            selectedRoutesSet.push(origin);

            const originAirport = allAirportInfo[origin];
            if (!originAirport){
                return;
            }
            
            if (params["Route Density"]){
                addDensity(originAirport, destinations.length)
            }

            if (!originAirport) {
                console.warn(`Origin airport not found: ${originAirport}`);
                return; // Skip this route because origin doesn't exist
            }

            destinations.forEach((destination) => {
                selectedRoutesSet.push(destination);

                const destinationAirport = allAirportInfo[destination];
                if (!destinationAirport) {
                    console.warn(`Destination airport not found: ${destination}`);
                    return; // Skip this route because destination doesn't exist
                }

                const linePoints = createGeodesicLine(originAirport["latitude"], -originAirport["longitude"], destinationAirport["latitude"], -destinationAirport["longitude"], geoRadius);
                lineAggregate.push(linePoints);

                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                geometry.setDrawRange(0, 0); 

                const material = new THREE.LineBasicMaterial({ 
                    color: parseInt(allAirlineInfo[airlineName]["Color"], 16),
                });
                const lineMesh = new THREE.Line(geometry, material);

                earthGroup.add(lineMesh);
                lineMeshes.push(lineMesh);
            });
        });
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
        new THREE.SphereGeometry(0.01, 8, 8),
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

    // gui.add(params, "Division Ratio", 1, 20).onChange(function(val){
    //     params["Division Ratio"] = val;
    // });

    gui.add(params, "Line Length", 0, 128).onChange(function(val){
        params["Line Length"] = parseInt(val);
        animationCount = 0;
    });

    const airlineList = {};
    Object.keys(allAirlineRoutes).forEach(airline => {
        airlineList[airline] = airline;
    });

    gui.add(params, "Airline", airlineList).onChange(function(val){
        updateSelectedAirline(val);
    });
}

async function init() {
    // Load airport info
    try {
        const airportResponse = await fetch('https://raw.githubusercontent.com/BPanoramic56/Panoramic56/refs/heads/main/Assets/Docs/Airports.json');
        allAirportInfo = await airportResponse.json();
    } 
    catch (err) {
        console.error("Error loading airport info:", err);
    }

    // Load airline routes
    try {
        const routeResponse = await fetch('https://raw.githubusercontent.com/BPanoramic56/Panoramic56/refs/heads/main/Assets/Docs/AirConnecta.JSON');
        allAirlineRoutes = await routeResponse.json();
    }
    catch (err) {
        console.error("Error loading airline routes:", err);
    }

    // Load airline info
    try {
        const airlineResponse = await fetch('https://raw.githubusercontent.com/BPanoramic56/Panoramic56/refs/heads/main/Assets/Docs/AirlineInfo.Json');
        allAirlineInfo = await airlineResponse.json();
    }
    catch (err) {
        console.error("Error loading airline routes:", err);
    }

    initGUI();

    animate();
}

init(); // ← Start everything