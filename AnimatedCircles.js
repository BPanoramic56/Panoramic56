const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const scope = 75;
const speed = 6;
const half = speed/2;
innerWidth = canvas.clientWidth;
innerHeight = canvas.clientHeight;
ctx.strokeStyle = "rgb(255, 61, 230)";

var mouse = {
    x : undefined,
    y : undefined
}

var colorArray = [
    'rgb(68, 61, 230)',
    'rgb(255, 107, 108)',
    'rgb(255, 255, 251)',
    'rgb(45, 147, 173)',
    'rgb(117, 228, 179)',
    '#0074c8',
    'rgba(0, 116, 200, 0.2)'
];

const maxRadius = 40;
const minRadius = 2;

window.addEventListener("mousemove", function(event){
    mouse.x = event.x - 130;
    mouse.y = event.y - 30;
}) 

class Circle {
    constructor(x, y, radius, dx, dy) {
        this.x      = x;
        this.y      = y;
        this.radius = radius;
        this.orRadius = radius;
        this.dx     = dx;
        this.dy     = dy;
        this.color  = colorArray[Math.floor(Math.random() * colorArray.length)];

        this.draw = function () {
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            ctx.fill();
        };

        this.update = function () {
            if (this.x + this.radius > innerWidth || this.x - this.radius < 0) {
                this.dx = -this.dx;
            }
            if (this.y + this.radius > innerHeight || this.y - this.radius < 0) {
                this.dy = -this.dy;
            }

            this.x += this.dx;
            this.y += this.dy;

            if ((mouse.x + scope > this.x && mouse.x - scope < this.x && mouse.y + scope > this.y && mouse.y - scope < this.y) && (this.radius < maxRadius)){
                this.radius += 1;
            }
            else if (this.radius > this.orRadius){
                this.radius -= 2;
            }
            else if (this.radius < minRadius){
                this.radius = this.orRadius;
            }
            this.draw();
        };
    }
}


var circleArray = [];

for (var i = 0; i < 800; i++){

    var radius = ((2 * Math.random()) * 2) + minRadius;
    var x = Math.random() * (innerWidth - radius * 2) + radius;
    var y = Math.random() * (innerHeight - radius * 2) + radius;
    var dx = (Math.random() * speed) - half;
    var dy = (Math.random() * speed) - half;

    circleArray.push(new Circle(x, y, radius, dx, dy));
}

function animate(){
    requestAnimationFrame(animate);
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for (var i = 0; i < circleArray.length; i++){
        circleArray[i].update()
    }
}

animate();