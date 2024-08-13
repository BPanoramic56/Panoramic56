// require("/Users/brunogomespascotto/odin-recipes/src/main.css");
import "./styles.css";


let intro = document.querySelector('.intro-div');
let logo = document.querySelector('.logo-header');
let logoSpan = document.querySelectorAll('.intro-logo');
// require("./main.css");

window.addEventListener('DOMContentLoaded', () => { // All contents within this block will trigger whenever the page is loaded
    setTimeout(() => {
        logoSpan.forEach((span, idx) => {
            setTimeout(() => {
                span.classList.add('active');
            }, (idx + 1) * 400)
        });

        setTimeout(() => {
            logoSpan.forEach((span, idx) => {
                setTimeout(() => {
                    span.classList.remove('active');
                    span.classList.add('fade');
                }, (idx + 1) * 50)
            })
        }, 2000);

        setTimeout(() => {
            intro.style.top = '100vh';
        }, 2300);
    })
});
