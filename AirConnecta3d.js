import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

const w = window.innerWidth;
const h = window.innerHeight;
const geoRadius = 4;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);

function latLonToVector3(lat, lon, radius) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon + 180);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}


document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const fov = 75;
const aspect = w / h;
const near = 0.1;
const far = 100;
const textureLoader = new THREE.TextureLoader();

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
camera.position.z = 8;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const geometry = new THREE.IcosahedronGeometry(geoRadius, 12);

const earthMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load('earth-blue-marble.jpg'),
});

let airlineRoutes =         []
let airportInfo =           []
let selectedAirlineRoutes = [];
let lineAggregate = [];
let lineMeshes = [];
const pulseDots = [];

function updateSelectedAirline(airlineName, airlineRoutes) {

    if (airlineRoutes[airlineName]) {

        selectedAirlineRoutes = Object.entries(airlineRoutes[airlineName]).map(([origin, destinations]) => {
            return { [origin]: destinations };
        });

        selectedAirlineRoutes.forEach(route => {
            const origin = Object.keys(route)[0];
            const destinations = route[origin];  

            const originAirport = airportInfo[origin];
            if (!originAirport) {
                console.warn(`Origin airport not found: ${originAirport}`);
                return; // Skip this route because origin doesn't exist
            }
            destinations.forEach((destination) => {

                const destinationAirport = airportInfo[destination];
                if (!destinationAirport) {
                    console.warn(`Destination airport not found: ${destination}`);
                    return; // Skip this route because destination doesn't exist
                }

                const linePoints = createGeodesicLine(originAirport["latitude"], -originAirport["longitude"], destinationAirport["latitude"], -destinationAirport["longitude"], geoRadius);
                lineAggregate.push(linePoints);

                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                geometry.setDrawRange(0, 0); 

                const material = new THREE.LineBasicMaterial({ color: airlineInfo[airlineName]["Color"] });
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

function createGeodesicLine(lat1, lon1, lat2, lon2, radius, segments = 64) {
    const start = latLonToVector3(lat1, lon1, radius);
    const end = latLonToVector3(lat2, lon2, radius);

    const points = [];

    const archHeight = 1;
    // const archHeight = Math.random() * 2;
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
    requestAnimationFrame(animate);

    lineMeshes.forEach((line, i) => {
        const points = lineAggregate[i];
        if (animationCount <= points.length) {
            line.geometry.setDrawRange(0, animationCount);
        }
    });

    const pulseDuration = 5000;
    pulseDots.forEach(({ dot, points, startTime, delay}) => {
        if ((performance.now() - startTime - delay)> 0){
            const elapsed = (performance.now() - startTime - delay) % pulseDuration;
            const t = elapsed / pulseDuration;
            const index = Math.floor(t * (points.length - 1));

            dot.position.copy(points[index]);
        }
    });

    animationCount += 1;

    earthGroup.rotation.y = t * 0.00001;
    controls.update();
    renderer.render(scene, camera);
}

async function init() {
    // Load airport info
    try {
        const airportResponse = await fetch('https://raw.githubusercontent.com/BPanoramic56/Panoramic56/refs/heads/main/Assets/Docs/Airports.json');
        airportInfo = await airportResponse.json();
    } 
    catch (err) {
        console.error("Error loading airport info:", err);
    }

    // Load airline routes
    try {
        const routeResponse = await fetch('https://raw.githubusercontent.com/BPanoramic56/Panoramic56/refs/heads/main/Assets/Docs/AirConnecta.JSON');
        airlineRoutes = await routeResponse.json();
    }
    catch (err) {
        console.error("Error loading airline routes:", err);
    }

    // Load airline info
    try {
        const airlineInfo = await fetch('https://raw.githubusercontent.com/BPanoramic56/Panoramic56/refs/heads/main/Assets/Docs/AirlineInfo.JSON');
        airlineRoutes = await routeResponse.json();
    }
    catch (err) {
        console.error("Error loading airline routes:", err);
    }

    updateSelectedAirline("JBU", airlineRoutes);
  
    animate();
}

init(); // ← Start everything