// ==========================================
// Multi-Agent GD
// History Page
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // ==========================
    // DOM Elements
    // ==========================

    const searchInput = document.getElementById("search-input");

    const modeFilter = document.getElementById("mode-filter");

    const sortFilter = document.getElementById("sort-filter");

    const historyBody = document.getElementById("history-body");

    const startBtn = document.getElementById("start-btn");

    const dashboardBtn = document.getElementById("dashboard-btn");

    // ==========================
    // Dummy Discussion History
    // ==========================

    let discussions = [

        {
            topic: "Artificial Intelligence",
            date: "30 Jul 2026",
            mode: "Placement GD",
            duration: "10 Min",
            score: 86
        },

        {
            topic: "Remote Work",
            date: "28 Jul 2026",
            mode: "Corporate GD",
            duration: "15 Min",
            score: 82
        },

        {
            topic: "Electric Vehicles",
            date: "26 Jul 2026",
            mode: "Placement GD",
            duration: "20 Min",
            score: 90
        },

        {
            topic: "Climate Change",
            date: "24 Jul 2026",
            mode: "Debate",
            duration: "10 Min",
            score: 79
        },

        {
            topic: "Startup Culture",
            date: "22 Jul 2026",
            mode: "Placement GD",
            duration: "15 Min",
            score: 88
        }

    ];

        // ==========================
    // Render Table
    // ==========================

    function renderTable(data) {

        historyBody.innerHTML = "";

        if (data.length === 0) {

            historyBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">
                        No discussions found.
                    </td>
                </tr>
            `;

            return;

        }

        data.forEach((discussion, index) => {

            historyBody.innerHTML += `

                <tr>

                    <td>${discussion.topic}</td>

                    <td>${discussion.date}</td>

                    <td>${discussion.mode}</td>

                    <td>${discussion.duration}</td>

                    <td>${discussion.score}%</td>

                    <td>

                        <button
                            class="view-btn"
                            data-index="${index}">

                            View

                        </button>

                    </td>

                </tr>

            `;

        });

    }

    // Initial Load

    renderTable(discussions);

        // ==========================
    // Search
    // ==========================

    searchInput.addEventListener("input", filterHistory);

    modeFilter.addEventListener("change", filterHistory);

    sortFilter.addEventListener("change", filterHistory);

    function filterHistory() {

        let filtered = [...discussions];

        // ==========================
        // Search by Topic
        // ==========================

        const search = searchInput.value
            .trim()
            .toLowerCase();

        if (search !== "") {

            filtered = filtered.filter((discussion) =>

                discussion.topic
                    .toLowerCase()
                    .includes(search)

            );

        }

        // ==========================
        // Mode Filter
        // ==========================

        if (modeFilter.value !== "All") {

            filtered = filtered.filter((discussion) =>

                discussion.mode === modeFilter.value

            );

        }

        // ==========================
        // Sorting
        // ==========================

        switch (sortFilter.value) {

            case "Highest":

                filtered.sort((a, b) =>

                    b.score - a.score

                );

                break;

            case "Lowest":

                filtered.sort((a, b) =>

                    a.score - b.score

                );

                break;

            case "Newest":

                filtered.reverse();

                break;

            case "Oldest":

                break;

        }

        renderTable(filtered);

    }

    // ==========================
    // View Report
    // ==========================

    historyBody.addEventListener("click", (event) => {

        if (!event.target.classList.contains("view-btn")) {

            return;

        }

        const index = event.target.dataset.index;

        localStorage.setItem(
            "selectedDiscussion",
            JSON.stringify(discussions[index])
        );

        window.location.href = "feedback.html";

    });

    // ==========================
    // Navigation Buttons
    // ==========================

    startBtn.addEventListener("click", () => {

        window.location.href = "create-room.html";

    });

    dashboardBtn.addEventListener("click", () => {

        window.location.href = "dashboard.html";

    });

});