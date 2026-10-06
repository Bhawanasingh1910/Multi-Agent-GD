// ==========================================
// Multi-Agent GD
// History Page
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    if (!Store.requireLogin()) return;

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
    // Saved discussions (newest data comes from finished GDs)
    // ==========================

    const discussions = Store.getSessions().map(s => ({
        id: s.id,
        topic: s.topic,
        mode: s.mode,
        time: new Date(s.endedAt || s.startedAt).getTime(),
        date: Store.formatDate(s.endedAt || s.startedAt),
        duration: Store.mmss(s.elapsedSeconds),
        score: s.feedback && s.feedback.scores ? s.feedback.scores.overall : null
    }));

    // ==========================
    // Render Table
    // ==========================

    function renderTable(data) {

        if (data.length === 0) {

            historyBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">
                        ${discussions.length === 0
                            ? "No discussions yet. Start your first one!"
                            : "No discussions found."}
                    </td>
                </tr>
            `;

            return;

        }

        historyBody.innerHTML = data.map(d => `

                <tr>

                    <td>${Store.esc(d.topic)}</td>

                    <td>${d.date}</td>

                    <td>${Store.esc(d.mode)}</td>

                    <td>${d.duration}</td>

                    <td>${d.score === null ? "Pending" : d.score + "%"}</td>

                    <td>

                        <button
                            class="view-btn"
                            data-id="${Store.esc(d.id)}">

                            View

                        </button>

                    </td>

                </tr>

        `).join("");

    }

    // ==========================
    // Search / Filter / Sort
    // ==========================

    function filterHistory() {

        let filtered = [...discussions];

        const search = searchInput.value
            .trim()
            .toLowerCase();

        if (search !== "") {

            filtered = filtered.filter((d) =>
                d.topic.toLowerCase().includes(search)
            );

        }

        if (modeFilter.value !== "All") {

            filtered = filtered.filter((d) =>
                d.mode === modeFilter.value
            );

        }

        switch (sortFilter.value) {

            case "Highest":
                filtered.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
                break;

            case "Lowest":
                filtered.sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
                break;

            case "Oldest":
                filtered.sort((a, b) => a.time - b.time);
                break;

            case "Newest":
            default:
                filtered.sort((a, b) => b.time - a.time);
                break;

        }

        renderTable(filtered);

    }

    searchInput.addEventListener("input", filterHistory);

    modeFilter.addEventListener("change", filterHistory);

    sortFilter.addEventListener("change", filterHistory);

    // Initial Load (newest first)
    filterHistory();

    // ==========================
    // View Report
    // ==========================

    historyBody.addEventListener("click", (event) => {

        const button = event.target.closest(".view-btn");

        if (!button) return;

        window.location.href =
            "feedback.html?id=" + encodeURIComponent(button.dataset.id);

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
