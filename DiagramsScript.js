// require("./main.css");
// import "./styles.css";

document.querySelectorAll('.ChartDiv').forEach(box => {
    console.log("A");
    let hideTimeout;
    box.addEventListener('mouseover', () => {
        hideTimeout = setTimeout(() => {
            document.querySelectorAll('.ChartDiv').forEach(otherBox => {
                if (otherBox !== box) {
                    otherBox.classList.add('hidden');
                }
            });
        }, 1000); // 500ms delay before hiding other divs
    });

    box.addEventListener('mouseout', () => {
        clearTimeout(hideTimeout);
        document.querySelectorAll('.ChartDiv').forEach(otherBox => {
            otherBox.classList.remove('hidden');
        }, 1000);
    });
});
