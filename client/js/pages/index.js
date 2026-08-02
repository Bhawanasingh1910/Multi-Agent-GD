// ======================================
// Multi-Agent GD
// Home Page JavaScript
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    setupNavigation();

    setupButtons();

    smoothScroll();

});



// ================================
// Navigation Buttons
// ================================

function setupNavigation() {

    const loginBtn = document.querySelector(".login-btn");
    const signupBtn = document.querySelector(".signup-btn");

    if(loginBtn){

        loginBtn.addEventListener("click", () => {

            window.location.href = "auth.html";

        });

    }

    if(signupBtn){

        signupBtn.addEventListener("click", () => {

            window.location.href = "auth.html";

        });

    }

}



// ================================
// Hero Buttons
// ================================

function setupButtons(){

    const primaryBtn = document.querySelector(".primary-btn");
    const secondaryBtn = document.querySelector(".secondary-btn");

    const ctaBtn = document.querySelector(".cta-btn");

    if(ctaBtn){

        ctaBtn.addEventListener("click",()=>{

            window.location.href="auth.html";

        });

    }

    if(primaryBtn){

        primaryBtn.addEventListener("click", () => {

            window.location.href = "auth.html";

        });

    }



    if(secondaryBtn){

        secondaryBtn.addEventListener("click", () => {

            alert("Demo Coming Soon!");

        });

    }

}



// ================================
// Smooth Scroll
// ================================

function smoothScroll(){

    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link=>{

        link.addEventListener("click",(e)=>{

            e.preventDefault();

            const target=document.querySelector(link.getAttribute("href"));

            if(target){

                target.scrollIntoView({

                    behavior:"smooth"

                });

            }

        });

    });

}