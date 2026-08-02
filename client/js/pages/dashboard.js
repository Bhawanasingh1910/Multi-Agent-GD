// ==========================================
// Multi-Agent GD
// Dashboard Page
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Dashboard Loaded");

    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const username = document.getElementById("username");

    const dashboardLink = document.getElementById("dashboard-link");
    const historyLink = document.getElementById("history-link");
    const feedbackLink = document.getElementById("feedback-link");
    const profileLink = document.getElementById("profile-link");

    const startDiscussionBtn = document.getElementById("start-discussion-btn");

    const startCard = document.getElementById("start-card");
    const historyCard = document.getElementById("history-card");
    const feedbackCard = document.getElementById("feedback-card");
    const profileCard = document.getElementById("profile-card");

    const reportButtons =
        document.querySelectorAll(".open-report-btn");

    const viewReportBtn =
        document.getElementById("view-report-btn");

    // ==========================================
    // LOAD USER
    // ==========================================

    function loadUser() {

        const savedName =
            localStorage.getItem("username");

        if (savedName) {

            username.textContent = savedName;

        }

        else {

            username.textContent = "Guest";

        }

    }

    // ==========================================
    // NAVIGATION
    // ==========================================

    function navigate(page) {

        window.location.href = page;

    }

    // ==========================================
    // ACTIVE NAVBAR
    // ==========================================

    function highlightCurrentPage() {

        dashboardLink.classList.add("active");

    }

    // ==========================================
    // HERO BUTTON
    // ==========================================

    startDiscussionBtn.addEventListener("click", () => {

        navigate("create-discussion.html");

    });

    // ==========================================
    // QUICK ACTIONS
    // ==========================================

    startCard.addEventListener("click", () => {

        navigate("create-discussion.html");

    });

    historyCard.addEventListener("click", () => {

        navigate("history.html");

    });

    feedbackCard.addEventListener("click", () => {

        navigate("feedback.html");

    });

    profileCard.addEventListener("click", () => {

        navigate("profile.html");

    });

    // ==========================================
    // NAVBAR
    // ==========================================

    dashboardLink.addEventListener("click", (event) => {

        event.preventDefault();

        navigate("dashboard.html");

    });

    historyLink.addEventListener("click", (event) => {

        event.preventDefault();

        navigate("history.html");

    });

    feedbackLink.addEventListener("click", (event) => {

        event.preventDefault();

        navigate("feedback.html");

    });

    profileLink.addEventListener("click", (event) => {

        event.preventDefault();

        navigate("profile.html");

    });

    // ==========================================
    // OPEN REPORT BUTTONS
    // ==========================================

    reportButtons.forEach((button) => {

        button.addEventListener("click", () => {

            navigate("feedback.html");

        });

    });

    // ==========================================
    // LATEST REPORT
    // ==========================================

    viewReportBtn.addEventListener("click", () => {

        navigate("feedback.html");

    });

    // ==========================================
    // LOAD DASHBOARD STATS
    // ==========================================

    function loadDashboardStats() {

        document.getElementById("discussion-count").textContent = "18";

        document.getElementById("average-score").textContent = "82%";

        document.getElementById("practice-streak").textContent = "6 Days";

        document.getElementById("practice-time").textContent = "4.8 hrs";

        document.getElementById("confidence-score").textContent = "83%";

        document.getElementById("grammar-score").textContent = "91%";

        document.getElementById("vocabulary-score").textContent = "76%";

        document.getElementById("fluency-score").textContent = "88%";

    }

    // ==========================================
    // INITIALIZE PAGE
    // ==========================================

    function init() {

        loadUser();

        highlightCurrentPage();

        loadDashboardStats();

    }

    init();

});