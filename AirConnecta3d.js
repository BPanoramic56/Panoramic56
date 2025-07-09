import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

const geoRadius = 4;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

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

document.addEventListener('keydown', function (e) {

    const mouseMovement = 0.1;

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
                if (airport["latitude"]-acceptanceRange <= lat && airport["latitude"]+acceptanceRange >= lat && airport["longitude"]-acceptanceRange <= lon && airport["longitude"]+acceptanceRange >= lon){

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

                    document.getElementById("AirportName").innerHTML = airport["name"].toString();

                    document.getElementById("AirportInformation1").innerHTML = airport["state"].toString();

                    document.getElementById("AirportInformation2").innerHTML = `${airport["latitude"]}, ${airport["longitude"]}`

                    showInfoBox()
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

let allAirlineRoutes =      [];
let allAirportInfo =        [];
let allAirlineInfo =        [];
let selectedAirlineRoutes = [];
let selectedRoutesSet =     []; // This is just to help parse through the airports that actually matter for the selected airline
let lineAggregate =         [];
let lineMeshes =            [];
let pulseDots =             [];

const params = {
    "Dot Animation": false,
    "Line Animation": 0,
    "Variable Height": false,
    "Animation Speed": 1,
    "Line Length": 2,
    "Line Segments": 64,
    "Airline": "",
}

function updateSelectedAirline(airlineName) {
    earthGroup.children.slice().forEach((child) => {
    if (
        (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) || // Removes dots
        child instanceof THREE.Line) // Removes lines
    {
        earthGroup.remove(child);
        child.geometry?.dispose?.();
        child.material?.dispose?.();
    }
    });

    if (allAirlineRoutes[airlineName]) {

        selectedAirlineRoutes = Object.entries(allAirlineRoutes[airlineName]).map(([origin, destinations]) => {
            return { [origin]: destinations };
        });

        selectedAirlineRoutes.forEach(route => {
            const origin = Object.keys(route)[0];
            const destinations = route[origin];  

            selectedRoutesSet.push(origin);

            const originAirport = allAirportInfo[origin];
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

                const material = new THREE.LineBasicMaterial({ color: parseInt(allAirlineInfo[airlineName]["Color"], 16) });
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
            console.log(params["Line Animation"])
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
        emissiveIntensity: 1,
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

const earthGroup = new THREE.Group();
const earthMesh = new THREE.Mesh(geometry, earthMaterial);
earthGroup.add(earthMesh)

scene.add(earthGroup);
scene.add(new THREE.HemisphereLight(0xffffff, 0x000000));

let animationCount = 0;


function animate(t = 0) {

    handleLineAnimation();

    handleDotAnimation()

    animationCount += params["Animation Speed"];

    // earthGroup.rotation.y = t * 0.00001;
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

    gui.add(params, "Line Length", 0, 50).onChange(function(val){
        params["Line Length"] = parseInt(val);
        animationCount = 0;
    });

    gui.add(params, "Airline", {
        "KLM": "KLM",
        "BAW": "BAW",
        "AAL": "AAL",
        "UAL": "UAL",
        "DAL": "DAL",
        "JBU": "JBU",
        "QTR": "QTR"
    }).onChange(function(val){
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