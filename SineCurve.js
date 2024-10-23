const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth / 2;
canvas.height = window.innerHeight / 2;

columnWidth = 50;
ctx.strokeStyle = "rgb(255, 255, 255)";
ctx.fillStyle = "rgba(68, 61, 230, 0.566)";

ctx.font = (columnWidth/1.5) + 'px myFont';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

dragging = false;
draggingColumn = undefined;

var mouse = {
    x : undefined,
    y : undefined
}

class ShadowColumn{
    constructor(size, initX){
        this.size = size;
        this.x = initX;
        this.updateHeight();
    }

    draw = function(){
        this.updateHeight()
        ctx.fillStyle = "white";
        ctx.fillText(this.size, this.x + columnWidth / 2, this.y + (columnWidth/2));
        ctx.fillStyle = "rgba(68, 61, 230, 0.566)";
        ctx.fillRect(this.x, this.y, columnWidth, this.columnHeight);
    }
}

class Column{
    constructor(size, initX){
        this.size = size;
        this.x = initX;
        this.updateHeight();
    }

    updateHeight() {
        // Calculate the height based on current size and canvas height
        this.columnHeight = (this.size / columnCount) * canvas.height;
        this.y = canvas.height - this.columnHeight;  // Recalculate y position
    }

    draw = function(){
        this.updateHeight()
        ctx.fillStyle = "white";
        ctx.fillText(this.size, this.x + columnWidth / 2, this.y + (columnWidth/2));
        ctx.fillStyle = "rgba(68, 61, 230, 0.566)";
        ctx.fillRect(this.x, this.y, columnWidth, this.columnHeight);
    }

    isClicked() {
        // Check if the mouse click is within the bounds of the column
        return (
            mouse.x >= this.x &&                  
            mouse.x <= this.x + columnWidth
        );
    }
}

window.addEventListener("mousedown", function(event){
    mouse.x = event.x - 130;
    mouse.y = event.y - 30;
    for (var i = 0; i < columnCount; i++){
        if (columns[i].isClicked()){
            dragging = true;
            draggingColumn = columns[i];
        }
    }
}) 

window.addEventListener("mouseup", function(event){
    switchColumns();
    dragging = false;
}) 

window.addEventListener("mousemove", function(event){
    mouse.x = event.x - 130;
    // mouse.y = event.y - 30;
    if (dragging){
        mouse.x = event.x - 130;
        for (var i = 0; i < columnCount; i++){
            if (columns[i].isClicked()){
                shadowColumn.x = columns[i].x;
                // shadowColumn.draw();
            }
        }
    }
}) 

function switchColumns(){
    for (var i = 0; i < columnCount; i++){
        if (columns[i].isClicked()){
            tempSize = columns[i].size;
            columns[i].size = draggingColumn.size;
            draggingColumn.size = tempSize;
        }
    }
}


function requestAnimationWithSleep(ms) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    setTimeout(() => {
        requestAnimationFrame(animate);
    }, ms);
}

var columns = [];

var columnCount = Math.floor(canvas.width/columnWidth);

var shadowColumn = new Column(1, -100);


for (var i = 0; i < columnCount; i++){
    columns.push(new Column(i+1, i * columnWidth));
}

function animate(){
    requestAnimationWithSleep(250);

    // requestAnimationWithSleep(animate);
    // ctx.clearRect(0,0,canvas.width,canvas.height);
    // requestAnimationFrame();
    for (var i = 0; i < columnCount; i++){
        columns[i].draw();
        shadowColumn.draw();
    }
}

animate();